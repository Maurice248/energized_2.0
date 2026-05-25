import { isNotNull } from "drizzle-orm";
import { z } from "zod";
import type Stripe from "stripe";
import { adminProcedure, router } from "@/server/api/trpc";
import type { DB } from "@/server/db";
import { employerOrgs, user } from "@/server/db/schema";
import { getStripe, STRIPE_ENABLED } from "@/lib/stripe";

type CustomerBrief = {
  label: string;
  sublabel: string;
  orgHref: string | null;
};

function stripeCustomerBrief(c: Stripe.Customer | Stripe.DeletedCustomer): {
  email: string | null;
  name: string | null;
} {
  if (c.deleted ?? !("email" in c)) {
    return { email: null, name: null };
  }
  return { email: c.email ?? null, name: c.name ?? null };
}

async function loadEnergizedCustomerMap(db: DB): Promise<Map<string, CustomerBrief>> {
  const map = new Map<string, CustomerBrief>();

  const orgRows = await db
    .select({
      id: employerOrgs.id,
      name: employerOrgs.name,
      stripeCustomerId: employerOrgs.stripeCustomerId,
    })
    .from(employerOrgs)
    .where(isNotNull(employerOrgs.stripeCustomerId));

  for (const row of orgRows) {
    if (!row.stripeCustomerId) continue;
    map.set(row.stripeCustomerId, {
      label: row.name,
      sublabel: "Employer subscription / seats",
      orgHref: `/admin/organizations#org-${row.id}`,
    });
  }

  const userRows = await db
    .select({
      name: user.name,
      email: user.email,
      jobseekerStripeCustomerId: user.jobseekerStripeCustomerId,
    })
    .from(user)
    .where(isNotNull(user.jobseekerStripeCustomerId));

  for (const row of userRows) {
    if (!row.jobseekerStripeCustomerId) continue;
    const label =
      typeof row.name === "string" && row.name.trim().length > 0
        ? row.name.trim()
        : row.email.split("@")[0] ?? row.email;
    map.set(row.jobseekerStripeCustomerId, {
      label,
      sublabel: `Candidate Pro · ${row.email}`,
      orgHref: `/admin/users`,
    });
  }

  return map;
}

function serializeInvoice(
  inv: Stripe.Invoice,
  customerMap: Map<string, CustomerBrief>,
): {
  id: string;
  number: string | null;
  status: Stripe.Invoice.Status;
  currency: string;
  total: number;
  amountDue: number;
  amountPaid: number;
  createdAt: Date;
  dueAt: Date | null;
  customerId: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  energizedEntity: CustomerBrief & { inferredFromStripe?: boolean };
} {
  const customerId =
    typeof inv.customer === "string"
      ? inv.customer
      : typeof inv.customer === "object" &&
          inv.customer &&
          "deleted" in inv.customer &&
          inv.customer.deleted
        ? null
        : typeof inv.customer === "object" && inv.customer
          ? inv.customer.id
          : null;

  const mapped =
    customerId != null ? customerMap.get(customerId) : undefined;
  let energizedEntity: CustomerBrief & { inferredFromStripe?: boolean };
  const isExpandedCustomerDeleted =
    typeof inv.customer === "object" &&
    inv.customer !== null &&
    "deleted" in inv.customer &&
    inv.customer.deleted;

  if (mapped) {
    energizedEntity = { ...mapped };
  } else if (
    typeof inv.customer === "object" &&
    inv.customer &&
    !isExpandedCustomerDeleted
  ) {
    const { email, name } = stripeCustomerBrief(inv.customer);
    const label =
      name?.trim() ||
      email?.split("@")[0] ||
      email ||
      customerId?.replace(/^cus_/, "Customer ") ||
      "Unknown customer";
    energizedEntity = {
      label,
      sublabel: email ?? "Stripe customer (not matched in Energized yet)",
      orgHref: `/admin/organizations`,
      inferredFromStripe: true,
    };
  } else {
    energizedEntity = {
      label: customerId ?? "Unknown",
      sublabel: "Stripe customer",
      orgHref: null,
      inferredFromStripe: true,
    };
  }

  return {
    id: inv.id,
    number: inv.number,
    status: inv.status ?? "draft",
    currency: inv.currency,
    total: inv.total,
    amountDue: inv.amount_due,
    amountPaid: inv.amount_paid,
    createdAt: new Date(inv.created * 1000),
    dueAt:
      inv.due_date != null && inv.due_date > 0
        ? new Date(inv.due_date * 1000)
        : null,
    customerId,
    hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    invoicePdf: inv.invoice_pdf ?? null,
    energizedEntity,
  };
}

/** Open + uncollectible invoices needing collections follow-up (capped pagination). */
export const adminInvoicesRouter = router({
  attentionCount: adminProcedure.query(async () => {
    if (!STRIPE_ENABLED) return 0;

    try {
      const stripe = getStripe();
      const [open, unc] = await Promise.all([
        stripe.invoices.list({ status: "open", limit: 100 }),
        stripe.invoices.list({ status: "uncollectible", limit: 100 }),
      ]);

      const n = open.data.length + unc.data.length;
      if (open.has_more || unc.has_more) {
        return 99;
      }
      return Math.min(n, 99);
    } catch {
      return 0;
    }
  }),

  list: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(48),
      }),
    )
    .query(async ({ ctx, input }) => {
      const customerMap = await loadEnergizedCustomerMap(ctx.db);

      if (!STRIPE_ENABLED) {
        return {
          stripeEnabled: false as const,
          loadError: null as string | null,
          invoices: [] as ReturnType<typeof serializeInvoice>[],
          rollup: {
            openInView: 0,
            outstandingDueCents: 0,
            paidLast30dCents: 0,
            paidLast30dCount: 0,
          },
        };
      }

      try {
        const stripe = getStripe();
        const res = await stripe.invoices.list({
          limit: input.limit,
          expand: ["data.customer"],
        });

        const invoices = res.data.map((inv) =>
          serializeInvoice(inv, customerMap),
        );

        const now = Date.now();
        const thirtyD = now - 30 * 24 * 60 * 60 * 1000;
        let openInView = 0;
        let outstandingDueCents = 0;
        let paidLast30dCents = 0;
        let paidLast30dCount = 0;

        for (const inv of res.data) {
          if (inv.status === "open") {
            openInView += 1;
            outstandingDueCents += inv.amount_due;
          }
          if (inv.status === "paid") {
            const createdMs = inv.created * 1000;
            if (createdMs >= thirtyD) {
              paidLast30dCount += 1;
              paidLast30dCents += inv.amount_paid;
            }
          }
        }

        return {
          stripeEnabled: true as const,
          loadError: null as string | null,
          invoices,
          rollup: {
            openInView,
            outstandingDueCents,
            paidLast30dCents,
            paidLast30dCount,
          },
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to reach Stripe.";
        return {
          stripeEnabled: true as const,
          loadError: message,
          invoices: [] as ReturnType<typeof serializeInvoice>[],
          rollup: {
            openInView: 0,
            outstandingDueCents: 0,
            paidLast30dCents: 0,
            paidLast30dCount: 0,
          },
        };
      }
    }),
});
