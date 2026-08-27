import {
  and,
  asc,
  avg,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  isNotNull,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "@/server/api/trpc";
import {
  applications,
  auditLog,
  employerOrgs,
  introRequests,
  jobListings,
  jobMatches,
  orgMembers,
  profiles,
  revenueSnapshots,
  supportTickets,
  systemServices,
  user,
} from "@/server/db/schema";
import { fetchTopPages } from "@/lib/posthog";
import { adminInvoicesRouter } from "./admin-invoices";
import { adminFaqsRouter } from "./admin-faqs";
import { adminPagesRouter } from "./admin-pages";
import { adminProfileSettingsRouter } from "./admin-profile-settings";
import { adminSettingsRouter } from "./admin-settings";
import { adminTeamsRouter } from "./admin-teams";
import { adminTrainingsRouter } from "./admin-trainings";
import { adminUsersRouter } from "./admin-users";
import { adminVerificationsRouter } from "./admin-verifications";

/* ------------------------ Shared shapes ------------------------ */

const PROVINCE_TOKENS: Record<string, string> = {
  AB: "Alberta",
  BC: "British Columbia",
  ON: "Ontario",
  QC: "Québec",
  MB: "Prairies (SK/MB)",
  SK: "Prairies (SK/MB)",
  NS: "Atlantic CAN",
  NB: "Atlantic CAN",
  PE: "Atlantic CAN",
  NL: "Atlantic CAN",
  YT: "Territories",
  NT: "Territories",
  NU: "Territories",
};

function bucketLocation(loc: string | null): string {
  if (!loc) return "Other";
  const upper = loc.toUpperCase();
  for (const code of Object.keys(PROVINCE_TOKENS)) {
    if (upper.endsWith(`, ${code}`) || upper.endsWith(` ${code}`) || upper === code) {
      return PROVINCE_TOKENS[code];
    }
  }
  if (/CALGARY|EDMONTON|FORT M[CK]MURRAY/.test(upper)) return "Alberta";
  if (/VANCOUVER|VICTORIA|KELOWNA/.test(upper)) return "British Columbia";
  if (/TORONTO|OTTAWA|HAMILTON/.test(upper)) return "Ontario";
  if (/MONTR[ÉE]AL|QUEBEC|QU[ÉE]BEC/.test(upper)) return "Québec";
  if (/UNITED STATES|USA|, US$/.test(upper)) return "US · cross-border";
  return "Other";
}

const PLAN_MRR_CENTS: Record<string, number> = {
  package_a: 49_000, // $490
  package_b: 249_000, // $2,490
  package_c: 840_000, // $8,400
  package_gold: 249_000,
  package_platinum: 840_000,
};

const PLAN_LABEL: Record<string, { plan: string; label: string }> = {
  package_a: { plan: "starter", label: "Starter" },
  package_b: { plan: "growth", label: "Growth" },
  package_c: { plan: "enterprise", label: "Enterprise" },
  package_gold: { plan: "growth", label: "Growth" },
  package_platinum: { plan: "enterprise", label: "Enterprise" },
  trial: { plan: "trial", label: "Trial" },
  none: { plan: "trial", label: "Trial" },
};

function planMeta(planKey: string | null) {
  if (!planKey) return { plan: "trial", label: "Trial", mrr: 0 };
  const meta = PLAN_LABEL[planKey] ?? { plan: "starter", label: "Starter" };
  return {
    plan: meta.plan,
    label: meta.label,
    mrr: PLAN_MRR_CENTS[planKey] ?? 0,
  };
}

function fmtMrrShort(cents: number): string {
  if (cents === 0) return "$0";
  if (cents < 100_000) return `$${(cents / 100).toFixed(0)}`;
  return `$${(cents / 100).toLocaleString()}`;
}

const ORG_MEMBER_ROLE_RANK: Record<string, number> = {
  owner: 0,
  admin: 1,
  hiring_manager: 2,
  recruiter: 3,
  viewer: 4,
};

/* ----------------------- Organizations ------------------------ */

type OrgMemberBrief = {
  id: string;
  displayName: string;
  email: string;
  role: typeof orgMembers.$inferSelect.role;
  status: typeof orgMembers.$inferSelect.status;
};

function sortOrgMembers(list: OrgMemberBrief[]): OrgMemberBrief[] {
  return [...list].sort((a, b) => {
    const ra = ORG_MEMBER_ROLE_RANK[a.role] ?? 99;
    const rb = ORG_MEMBER_ROLE_RANK[b.role] ?? 99;
    if (ra !== rb) return ra - rb;
    return a.displayName.localeCompare(b.displayName);
  });
}

function maskStripeRef(id: string | null): string | null {
  if (!id) return null;
  if (id.length <= 14) return id;
  return `${id.slice(0, 10)}…${id.slice(-4)}`;
}

function splitEmployerAndTeam(membersSorted: OrgMemberBrief[]): {
  employerRows: OrgMemberBrief[];
  teamRows: OrgMemberBrief[];
} {
  if (membersSorted.length === 0) {
    return { employerRows: [], teamRows: [] };
  }

  const owners = membersSorted.filter((m) => m.role === "owner");
  if (owners.length > 0) {
    const ids = new Set(owners.map((m) => m.id));
    return {
      employerRows: owners,
      teamRows: membersSorted.filter((m) => !ids.has(m.id)),
    };
  }

  const admins = membersSorted.filter((m) => m.role === "admin");
  if (admins.length > 0) {
    const ids = new Set(admins.map((m) => m.id));
    return {
      employerRows: admins,
      teamRows: membersSorted.filter((m) => !ids.has(m.id)),
    };
  }

  const [first, ...rest] = membersSorted;
  return { employerRows: [first!], teamRows: rest };
}

const organizationsRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const orgRows = await ctx.db
      .select({
        id: employerOrgs.id,
        name: employerOrgs.name,
        verified: employerOrgs.verified,
        verifiedAt: employerOrgs.verifiedAt,
        domain: employerOrgs.domain,
        website: employerOrgs.website,
        hq: employerOrgs.hq,
        founded: employerOrgs.founded,
        tagline: employerOrgs.tagline,
        about: employerOrgs.about,
        logoUrl: employerOrgs.logoUrl,
        size: employerOrgs.size,
        primarySector: employerOrgs.primarySector,
        subSectors: employerOrgs.subSectors,
        plan: employerOrgs.plan,
        planRenewsAt: employerOrgs.planRenewsAt,
        subscriptionStatus: employerOrgs.subscriptionStatus,
        currentPeriodStart: employerOrgs.currentPeriodStart,
        cancelAtPeriodEnd: employerOrgs.cancelAtPeriodEnd,
        stripeCustomerId: employerOrgs.stripeCustomerId,
        stripeSubscriptionId: employerOrgs.stripeSubscriptionId,
        defaultWorkSetup: employerOrgs.defaultWorkSetup,
        hiringPace: employerOrgs.hiringPace,
        focusRoles: employerOrgs.focusRoles,
        domainVerifyEmailTo: employerOrgs.domainVerifyEmailTo,
        domainVerifyExpiresAt: employerOrgs.domainVerifyExpiresAt,
        createdAt: employerOrgs.createdAt,
        updatedAt: employerOrgs.updatedAt,
      })
      .from(employerOrgs)
      .orderBy(asc(employerOrgs.name));

    const memberRows = await ctx.db
      .select({
        orgId: orgMembers.orgId,
        memberId: orgMembers.id,
        role: orgMembers.role,
        status: orgMembers.status,
        inviteEmail: orgMembers.email,
        userName: user.name,
        userEmail: user.email,
      })
      .from(orgMembers)
      .leftJoin(user, eq(user.id, orgMembers.userId));

    const byOrg = new Map<string, OrgMemberBrief[]>();

    for (const row of memberRows) {
      const email =
        typeof row.userEmail === "string" && row.userEmail.length > 0
          ? row.userEmail
          : row.inviteEmail;
      const displayNameRaw =
        typeof row.userName === "string" && row.userName.trim().length > 0
          ? row.userName.trim()
          : null;
      const displayName =
        displayNameRaw ??
        row.inviteEmail.split("@")[0] ??
        email;

      const member: OrgMemberBrief = {
        id: row.memberId,
        displayName,
        email,
        role: row.role,
        status: row.status,
      };
      const list = byOrg.get(row.orgId) ?? [];
      list.push(member);
      byOrg.set(row.orgId, list);
    }

    return orgRows.map((org) => {
      const flat = sortOrgMembers(byOrg.get(org.id) ?? []);
      const { employerRows, teamRows } = splitEmployerAndTeam(flat);
      const billing = planMeta(org.plan);
      return {
        id: org.id,
        name: org.name,
        verified: org.verified,
        verifiedAt: org.verifiedAt,
        domain: org.domain,
        website: org.website,
        hq: org.hq,
        founded: org.founded,
        tagline: org.tagline,
        about: org.about,
        logoUrl: org.logoUrl,
        size: org.size,
        primarySector: org.primarySector,
        subSectors: org.subSectors,
        planKey: org.plan,
        planLabel: billing.label,
        billingTier: billing.plan,
        planRenewsAt: org.planRenewsAt,
        subscriptionStatus: org.subscriptionStatus,
        currentPeriodStart: org.currentPeriodStart,
        cancelAtPeriodEnd: org.cancelAtPeriodEnd,
        stripeCustomerMasked: maskStripeRef(org.stripeCustomerId),
        stripeSubscriptionMasked: maskStripeRef(org.stripeSubscriptionId),
        defaultWorkSetup: org.defaultWorkSetup,
        hiringPace: org.hiringPace,
        focusRoles: org.focusRoles,
        domainVerifyEmailTo: org.domainVerifyEmailTo,
        domainVerifyExpiresAt: org.domainVerifyExpiresAt,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
        employerRows,
        teamRows,
      };
    });
  }),
});

/* ------------------------ Job postings (all) ------------------------ */

const adminJobsRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        ...getTableColumns(jobListings),
        orgName: employerOrgs.name,
        orgVerified: employerOrgs.verified,
        creatorName: user.name,
        creatorEmail: user.email,
      })
      .from(jobListings)
      .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
      .leftJoin(user, eq(user.id, jobListings.createdByUserId))
      .orderBy(desc(jobListings.updatedAt));

    return rows;
  }),
});

/* --------------------------- Overview --------------------------- */

const overviewRouter = router({
  kpis: adminProcedure.query(async ({ ctx }) => {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Latest snapshot for MRR.
    const [snap] = await ctx.db
      .select()
      .from(revenueSnapshots)
      .orderBy(desc(revenueSnapshots.snapshotDate))
      .limit(1);

    // Snapshot 30 days ago for delta.
    const [snapPrev] = await ctx.db
      .select()
      .from(revenueSnapshots)
      .where(
        sql`${revenueSnapshots.snapshotDate} <= ${since30d.toISOString().slice(0, 10)}`,
      )
      .orderBy(desc(revenueSnapshots.snapshotDate))
      .limit(1);

    const [{ count: userTotal }] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(user);
    const [{ count: usersNew30d }] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(user)
      .where(gte(user.createdAt, since30d));
    const [{ count: candidateCount }] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(user)
      .where(eq(user.role, "jobseeker"));
    const [{ count: employerSeatCount }] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(user)
      .where(eq(user.role, "employer"));

    const [{ count: orgTotal }] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(employerOrgs);
    const [{ count: orgEnterprise }] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(employerOrgs)
      .where(eq(employerOrgs.plan, "package_c"));
    const [{ count: orgGrowth }] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(employerOrgs)
      .where(eq(employerOrgs.plan, "package_b"));
    const [{ count: orgNew7d }] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(employerOrgs)
      .where(gte(employerOrgs.createdAt, since7d));

    const [{ count: jobsLive }] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(jobListings)
      .where(eq(jobListings.status, "published"));
    const [{ count: jobsNew7d }] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(jobListings)
      .where(
        and(eq(jobListings.status, "published"), gte(jobListings.publishedAt, since7d)),
      );
    const [{ count: jobsVerified }] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(jobListings)
      .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
      .where(
        and(eq(jobListings.status, "published"), eq(employerOrgs.verified, true)),
      );

    const [matchAgg] = await ctx.db
      .select({
        score: avg(jobMatches.score),
        count: sql<number>`count(*)::int`,
      })
      .from(jobMatches);
    const [matchAggPrev] = await ctx.db
      .select({ score: avg(jobMatches.score) })
      .from(jobMatches)
      .where(sql`${jobMatches.updatedAt} < ${since30d}`);

    const placementsYtd = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(applications)
      .where(
        and(
          eq(applications.status, "offer"),
          sql`extract(year from ${applications.createdAt}) = extract(year from now())`,
        ),
      );

    const mrrCents = snap?.mrrCents ?? 0;
    const mrrPrev = snapPrev?.mrrCents ?? 0;
    const mrrDeltaPct =
      mrrPrev > 0 ? ((mrrCents - mrrPrev) / mrrPrev) * 100 : null;

    const avgScore = matchAgg?.score ? Number(matchAgg.score) : null;
    const avgScorePrev = matchAggPrev?.score
      ? Number(matchAggPrev.score)
      : null;
    const matchDelta =
      avgScore !== null && avgScorePrev !== null
        ? avgScore - avgScorePrev
        : null;

    const candidatePct = userTotal === 0 ? 0 : (candidateCount / userTotal) * 100;
    const employerPct = userTotal === 0 ? 0 : (employerSeatCount / userTotal) * 100;
    const verifiedPct = jobsLive === 0 ? 0 : (jobsVerified / jobsLive) * 100;

    return {
      mrr: {
        cents: mrrCents,
        deltaPct: mrrDeltaPct,
        activeOrgs: snap?.activeOrgCount ?? orgTotal,
      },
      users: {
        total: userTotal,
        new30d: usersNew30d,
        candidatePct,
        employerPct,
      },
      employers: {
        active: orgTotal,
        new7d: orgNew7d,
        enterprise: orgEnterprise,
        growth: orgGrowth,
      },
      jobs: {
        live: jobsLive,
        new7d: jobsNew7d,
        verifiedPct,
      },
      ai: {
        avgScore,
        deltaPp: matchDelta,
        placementsYtd: placementsYtd[0]?.count ?? 0,
      },
    };
  }),

  revenueSeries: adminProcedure
    .input(z.object({ months: z.number().int().min(1).max(36).default(12) }).optional())
    .query(async ({ ctx, input }) => {
      const months = input?.months ?? 12;
      const rows = await ctx.db
        .select({
          snapshotDate: revenueSnapshots.snapshotDate,
          mrrCents: revenueSnapshots.mrrCents,
          newSubsCount: revenueSnapshots.newSubsCount,
          churnedCount: revenueSnapshots.churnedCount,
        })
        .from(revenueSnapshots)
        .orderBy(desc(revenueSnapshots.snapshotDate))
        .limit(400);

      // Group by year-month, pick the latest row per month.
      const byMonth = new Map<
        string,
        { mrr: number; new: number; churn: number; date: string }
      >();
      for (const row of rows) {
        const ym = row.snapshotDate.slice(0, 7); // YYYY-MM
        if (!byMonth.has(ym)) {
          byMonth.set(ym, {
            mrr: row.mrrCents / 1000, // Convert to dollar-thousands (k)
            new: row.newSubsCount,
            churn: row.churnedCount,
            date: row.snapshotDate,
          });
        } else {
          const entry = byMonth.get(ym)!;
          entry.new += row.newSubsCount;
          entry.churn += row.churnedCount;
        }
      }

      const sorted = Array.from(byMonth.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .slice(-months);

      return sorted.map(([ym, v]) => ({
        d: new Date(`${ym}-01T00:00:00Z`).toLocaleString("en-US", {
          month: "short",
          timeZone: "UTC",
        }),
        mrr: Math.round(v.mrr / 100), // dollars-k → thousand-dollars
        new: v.new,
        churn: v.churn,
      }));
    }),

  revenueBreakdown: adminProcedure.query(async ({ ctx }) => {
    const [snap] = await ctx.db
      .select()
      .from(revenueSnapshots)
      .orderBy(desc(revenueSnapshots.snapshotDate))
      .limit(1);

    const buckets = [
      {
        key: "enterprise" as const,
        label: "Enterprise",
        cents: snap?.enterpriseCents ?? 0,
        color: "#004984",
      },
      {
        key: "growth" as const,
        label: "Growth",
        cents: snap?.growthCents ?? 0,
        color: "#1CAAE2",
      },
      {
        key: "starter" as const,
        label: "Starter",
        cents: snap?.starterCents ?? 0,
        color: "#9CD7F2",
      },
      {
        key: "addon" as const,
        label: "Add-ons & overages",
        cents: snap?.addonsCents ?? 0,
        color: "#FF7A59",
      },
    ];

    // Org counts per plan for the "(23 orgs)" subtitles.
    const planCounts = await ctx.db
      .select({
        plan: employerOrgs.plan,
        count: sql<number>`count(*)::int`,
      })
      .from(employerOrgs)
      .groupBy(employerOrgs.plan);

    const countByBucket: Record<string, number> = {
      enterprise: 0,
      growth: 0,
      starter: 0,
      addon: 0,
    };
    for (const row of planCounts) {
      const planKey = row.plan ?? "";
      if (planKey === "package_c" || planKey === "package_platinum") {
        countByBucket.enterprise += row.count;
      } else if (planKey === "package_b" || planKey === "package_gold") {
        countByBucket.growth += row.count;
      } else if (planKey === "package_a") {
        countByBucket.starter += row.count;
      }
    }

    const total = buckets.reduce((sum, b) => sum + b.cents, 0) || 1;
    return buckets.map((b) => ({
      key: b.key,
      label:
        b.key === "addon"
          ? b.label
          : `${b.label} (${countByBucket[b.key]} orgs)`,
      cents: b.cents,
      amount: fmtMrrShort(b.cents),
      pct: Math.max(0, Math.round((b.cents / total) * 100)),
      color: b.color,
    }));
  }),

  topEmployers: adminProcedure
    .input(
      z
        .object({
          plan: z
            .enum(["all", "enterprise", "growth", "starter", "trial"])
            .default("all"),
          limit: z.number().int().min(1).max(20).default(7),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const plan = input?.plan ?? "all";
      const limit = input?.limit ?? 7;

      // NOTE: Drizzle renders `${employerOrgs.id}` inside a correlated
      // subquery as the bare column name `"id"`, which Postgres binds to the
      // inner table (`org_members.id`). Use fully-qualified literals so the
      // correlation points at the outer row.
      const orgs = await ctx.db
        .select({
          id: employerOrgs.id,
          name: employerOrgs.name,
          plan: employerOrgs.plan,
          subscriptionStatus: employerOrgs.subscriptionStatus,
          logoColor: employerOrgs.logoColor,
          logoUrl: employerOrgs.logoUrl,
          hq: employerOrgs.hq,
          verified: employerOrgs.verified,
          seatCount: sql<number>`(
            SELECT COUNT(*)::int FROM "org_members"
            WHERE "org_members"."org_id" = "employer_orgs"."id"
              AND "org_members"."status" = 'active'
          )`,
          liveJobs: sql<number>`(
            SELECT COUNT(*)::int FROM "job_listings"
            WHERE "job_listings"."org_id" = "employer_orgs"."id"
              AND "job_listings"."status" = 'published'
          )`,
          ownerName: sql<string | null>`(
            SELECT "user"."name" FROM "org_members"
            INNER JOIN "user" ON "user"."id" = "org_members"."user_id"
            WHERE "org_members"."org_id" = "employer_orgs"."id"
              AND "org_members"."role" = 'owner'
            ORDER BY "org_members"."created_at" ASC
            LIMIT 1
          )`,
        })
        .from(employerOrgs)
        .orderBy(desc(employerOrgs.createdAt))
        .limit(120);

      const filtered = orgs.filter((o) => {
        if (plan === "all") return true;
        const meta = planMeta(o.plan);
        return meta.plan === plan;
      });

      const enriched = filtered.map((o) => {
        const meta = planMeta(o.plan);
        const seatCap = Math.max(o.seatCount || 1, 5);
        const usePct = Math.min(
          100,
          Math.round((o.liveJobs / (seatCap * 5)) * 100),
        );
        const status =
          o.verified === false
            ? "crit"
            : o.subscriptionStatus === "past_due" ||
                o.subscriptionStatus === "unpaid"
              ? "warn"
              : o.subscriptionStatus === "trialing" ||
                  o.subscriptionStatus === "none"
                ? "idle"
                : "good";
        const statusLabel =
          status === "crit"
            ? "Flagged"
            : status === "warn"
              ? "At cap"
              : status === "idle"
                ? "Quiet"
                : "Active";

        const initials = o.name
          .split(/\s+/)
          .map((part) => part[0])
          ?.filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase();

        const ownerShort = o.ownerName
          ? o.ownerName.split(" ").slice(0, 1).join(" ") +
            (o.ownerName.split(" ")[1]
              ? ` ${o.ownerName.split(" ")[1].charAt(0)}.`
              : "")
          : null;

        const metaLine = [
          o.hq ?? null,
          `${o.seatCount || 0} seat${o.seatCount === 1 ? "" : "s"}`,
          ownerShort,
        ]
          .filter(Boolean)
          .join(" · ");

        return {
          id: o.id,
          name: o.name,
          meta: metaLine,
          initials: initials || "??",
          color: o.logoColor,
          logoUrl: o.logoUrl,
          plan: meta.plan,
          planLabel: meta.label,
          use: usePct,
          useTxt: `${usePct}% · ${o.liveJobs} job${o.liveJobs === 1 ? "" : "s"}`,
          useTone:
            usePct > 90 ? "warn" : usePct < 15 && meta.plan !== "trial" ? "crit" : "",
          mrrCents: meta.mrr,
          mrr: fmtMrrShort(meta.mrr),
          status,
          statusLabel,
        };
      });

      enriched.sort((a, b) => b.mrrCents - a.mrrCents);
      return enriched.slice(0, limit);
    }),

  geo: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ location: profiles.location })
      .from(profiles)
      .where(isNotNull(profiles.location));

    const byBucket = new Map<string, number>();
    for (const row of rows) {
      const bucket = bucketLocation(row.location);
      byBucket.set(bucket, (byBucket.get(bucket) ?? 0) + 1);
    }
    const entries = Array.from(byBucket.entries())
      .filter(([k]) => k !== "Other")
      .sort((a, b) => b[1] - a[1]);
    const max = entries[0]?.[1] ?? 1;
    return entries.map(([name, users]) => ({
      name,
      users: users.toLocaleString(),
      pct: Math.max(4, Math.round((users / max) * 100)),
    }));
  }),

  topPages: adminProcedure.query(async () => {
    const rows = await fetchTopPages(5);
    return rows.map((r) => ({
      path: r.path,
      views: r.views >= 1000 ? `${(r.views / 1000).toFixed(1)}k` : `${r.views}`,
      spark: r.spark.length ? r.spark : [r.views],
    }));
  }),

  activity: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        actorLabel: auditLog.actorLabel,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        meta: auditLog.meta,
        at: auditLog.at,
        actorName: user.name,
      })
      .from(auditLog)
      .leftJoin(user, eq(user.id, auditLog.actorUserId))
      .orderBy(desc(auditLog.at))
      .limit(10);

    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      actor: row.actorName ?? row.actorLabel ?? "system",
      entityType: row.entityType,
      entityId: row.entityId,
      meta: row.meta as Record<string, unknown>,
      at: row.at,
    }));
  }),
});

/* ---------------------------- Audit log --------------------------- */

const auditRouter = router({
  list: adminProcedure
    .input(
      z.object({
        /** Admin-only; raised cap supports CSV export (500 rows) without extra round-trips. */
        limit: z.number().int().min(1).max(500).default(40),
        offset: z.number().int().min(0).max(5000).default(0),
        q: z.string().max(200).optional(),
        entityType: z.string().max(64).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      const et = input.entityType?.trim();
      if (et) {
        conditions.push(eq(auditLog.entityType, et));
      }

      const q = input.q?.trim();
      if (q) {
        const term = `%${q}%`;
        conditions.push(
          or(
            ilike(auditLog.action, term),
            ilike(auditLog.actorLabel, term),
            ilike(user.name, term),
            ilike(user.email, term),
          )!,
        );
      }

      const whereClause = conditions.length ? and(...conditions) : undefined;

      const [{ total }] = await ctx.db
        .select({ total: sql<number>`count(*)::int` })
        .from(auditLog)
        .leftJoin(user, eq(user.id, auditLog.actorUserId))
        .where(whereClause);

      const rows = await ctx.db
        .select({
          id: auditLog.id,
          action: auditLog.action,
          actorLabel: auditLog.actorLabel,
          entityType: auditLog.entityType,
          entityId: auditLog.entityId,
          meta: auditLog.meta,
          at: auditLog.at,
          actorName: user.name,
        })
        .from(auditLog)
        .leftJoin(user, eq(user.id, auditLog.actorUserId))
        .where(whereClause)
        .orderBy(desc(auditLog.at))
        .limit(input.limit)
        .offset(input.offset);

      return {
        total,
        items: rows.map((row) => ({
          id: row.id,
          action: row.action,
          actor: row.actorName ?? row.actorLabel ?? "system",
          entityType: row.entityType,
          entityId: row.entityId,
          meta: row.meta as Record<string, unknown>,
          at: row.at,
        })),
      };
    }),
});

/* ---------------------------- Tickets --------------------------- */

const ticketsRouter = router({
  list: adminProcedure
    .input(
      z
        .object({
          status: z.enum(["open", "in_progress", "closed", "all"]).default("open"),
          limit: z.number().int().min(1).max(50).default(6),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const status = input?.status ?? "open";
      const limit = input?.limit ?? 6;
      const conditions = [];
      if (status !== "all") {
        conditions.push(eq(supportTickets.status, status));
      }

      const rows = await ctx.db
        .select({
          id: supportTickets.id,
          code: supportTickets.code,
          subject: supportTickets.subject,
          priority: supportTickets.priority,
          status: supportTickets.status,
          createdAt: supportTickets.createdAt,
          requesterName: user.name,
          orgName: employerOrgs.name,
        })
        .from(supportTickets)
        .leftJoin(user, eq(user.id, supportTickets.requesterUserId))
        .leftJoin(employerOrgs, eq(employerOrgs.id, supportTickets.requesterOrgId))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(
          sql`CASE ${supportTickets.priority} WHEN 'p1' THEN 1 WHEN 'p2' THEN 2 ELSE 3 END`,
          desc(supportTickets.createdAt),
        )
        .limit(limit);

      const [{ total }] = await ctx.db
        .select({ total: sql<number>`count(*)::int` })
        .from(supportTickets)
        .where(eq(supportTickets.status, "open"));
      const [{ p1Count }] = await ctx.db
        .select({ p1Count: sql<number>`count(*)::int` })
        .from(supportTickets)
        .where(
          and(
            eq(supportTickets.status, "open"),
            eq(supportTickets.priority, "p1"),
          ),
        );

      return {
        items: rows.map((t) => ({
          id: t.id,
          code: t.code,
          subject: t.subject,
          priority: t.priority,
          status: t.status,
          urgent: t.priority === "p1",
          meta: [t.orgName, t.requesterName, hoursAgo(t.createdAt)]
            .filter(Boolean)
            .join(" · "),
        })),
        openTotal: total,
        p1Total: p1Count,
      };
    }),
});

/* ------------------------ Support inbox ------------------------ */

const supportRouter = router({
  inbox: adminProcedure.query(async ({ ctx }) => {
    const ticketLimit = 100;
    const introLimit = 100;

    const ticketAssignee = alias(user, "support_ticket_assignee");
    const ticketRequester = alias(user, "support_ticket_requester");
    const introCandidate = alias(user, "support_intro_candidate");
    const introRequestedBy = alias(user, "support_intro_requested_by");

    const [
      tickets,
      introInquiries,
      serviceRows,
      ticketStatusRows,
      introStatusRows,
    ] = await Promise.all([
      ctx.db
        .select({
          id: supportTickets.id,
          code: supportTickets.code,
          subject: supportTickets.subject,
          body: supportTickets.body,
          priority: supportTickets.priority,
          status: supportTickets.status,
          createdAt: supportTickets.createdAt,
          updatedAt: supportTickets.updatedAt,
          firstResponseAt: supportTickets.firstResponseAt,
          closedAt: supportTickets.closedAt,
          requesterName: ticketRequester.name,
          requesterEmail: ticketRequester.email,
          orgName: employerOrgs.name,
          assigneeName: ticketAssignee.name,
        })
        .from(supportTickets)
        .leftJoin(
          ticketRequester,
          eq(ticketRequester.id, supportTickets.requesterUserId),
        )
        .leftJoin(
          employerOrgs,
          eq(employerOrgs.id, supportTickets.requesterOrgId),
        )
        .leftJoin(
          ticketAssignee,
          eq(ticketAssignee.id, supportTickets.assignedTo),
        )
        .orderBy(
          sql`CASE ${supportTickets.priority} WHEN 'p1' THEN 1 WHEN 'p2' THEN 2 ELSE 3 END`,
          desc(supportTickets.createdAt),
        )
        .limit(ticketLimit),

      ctx.db
        .select({
          id: introRequests.id,
          status: introRequests.status,
          message: introRequests.message,
          createdAt: introRequests.createdAt,
          expiresAt: introRequests.expiresAt,
          orgName: employerOrgs.name,
          candidateName: introCandidate.name,
          candidateEmail: introCandidate.email,
          requestedByName: introRequestedBy.name,
        })
        .from(introRequests)
        .leftJoin(employerOrgs, eq(employerOrgs.id, introRequests.orgId))
        .leftJoin(
          introCandidate,
          eq(introCandidate.id, introRequests.candidateUserId),
        )
        .leftJoin(
          introRequestedBy,
          eq(introRequestedBy.id, introRequests.requestedByUserId),
        )
        .orderBy(desc(introRequests.createdAt))
        .limit(introLimit),

      ctx.db
        .select({
          slug: systemServices.slug,
          name: systemServices.name,
          category: systemServices.category,
          lastStatus: systemServices.lastStatus,
          lastLatencyMs: systemServices.lastLatencyMs,
          uptime30dPct: systemServices.uptime30dPct,
          lastCheckedAt: systemServices.lastCheckedAt,
        })
        .from(systemServices)
        .orderBy(asc(systemServices.category), asc(systemServices.name)),

      ctx.db
        .select({
          status: supportTickets.status,
          n: sql<number>`count(*)::int`,
        })
        .from(supportTickets)
        .groupBy(supportTickets.status),

      ctx.db
        .select({
          status: introRequests.status,
          n: sql<number>`count(*)::int`,
        })
        .from(introRequests)
        .groupBy(introRequests.status),
    ]);

    const ticketTotals = { open: 0, in_progress: 0, closed: 0, all: 0 };
    for (const row of ticketStatusRows) {
      if (row.status === "open") ticketTotals.open = row.n;
      if (row.status === "in_progress") ticketTotals.in_progress = row.n;
      if (row.status === "closed") ticketTotals.closed = row.n;
      ticketTotals.all += row.n;
    }

    const introTotals = {
      pending: 0,
      accepted: 0,
      declined: 0,
      canceled: 0,
      expired: 0,
    };
    for (const row of introStatusRows) {
      if (row.status === "pending") introTotals.pending = row.n;
      if (row.status === "accepted") introTotals.accepted = row.n;
      if (row.status === "declined") introTotals.declined = row.n;
      if (row.status === "canceled") introTotals.canceled = row.n;
      if (row.status === "expired") introTotals.expired = row.n;
    }

    return {
      tickets,
      introInquiries,
      services: serviceRows.map((s) => ({
        slug: s.slug,
        name: s.name,
        category: s.category,
        lastStatus: s.lastStatus,
        lastLatencyMs: s.lastLatencyMs,
        uptimePct: Number(s.uptime30dPct),
        lastCheckedAt: s.lastCheckedAt,
      })),
      ticketTotals,
      introTotals,
    };
  }),

  setTicketStatus: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["open", "in_progress", "closed"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [current] = await ctx.db
        .select({
          id: supportTickets.id,
          status: supportTickets.status,
          assignedTo: supportTickets.assignedTo,
        })
        .from(supportTickets)
        .where(eq(supportTickets.id, input.id))
        .limit(1);

      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found." });
      }

      const [updated] = await ctx.db
        .update(supportTickets)
        .set({
          status: input.status,
          closedAt: input.status === "closed" ? new Date() : null,
          assignedTo:
            input.status === "in_progress"
              ? (current.assignedTo ?? ctx.session.user.id)
              : current.assignedTo,
          updatedAt: new Date(),
        })
        .where(eq(supportTickets.id, input.id))
        .returning({
          id: supportTickets.id,
          status: supportTickets.status,
        });

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found." });
      }

      await ctx.db.insert(auditLog).values({
        actorUserId: ctx.session.user.id,
        actorLabel: ctx.session.user.email,
        action: "support_ticket.status_changed",
        entityType: "support_ticket",
        entityId: input.id,
        meta: { from: current.status, to: input.status },
      });

      return updated;
    }),
});

function hoursAgo(d: Date): string {
  const diff = Date.now() - d.getTime();
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 1) return `${Math.max(1, Math.floor(diff / 60_000))}m open`;
  if (hours < 24) return `${hours}h open`;
  const days = Math.floor(hours / 24);
  return `${days}d open`;
}

/* ---------------------------- System ---------------------------- */

const systemRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(systemServices)
      .orderBy(systemServices.name);

    let operationalCount = 0;
    let degradedCount = 0;
    let outageCount = 0;
    let p95Latency = 0;
    let stripeDegradedSince: Date | null = null;

    const services = rows.map((s) => {
      if (s.lastStatus === "operational") operationalCount += 1;
      if (s.lastStatus === "degraded") degradedCount += 1;
      if (s.lastStatus === "outage") outageCount += 1;
      if (s.lastLatencyMs && s.lastLatencyMs > p95Latency) {
        p95Latency = s.lastLatencyMs;
      }
      if (s.slug === "stripe-webhooks" && s.lastStatus === "degraded") {
        stripeDegradedSince = s.lastIncidentAt;
      }

      const stateLabel =
        s.lastStatus === "operational"
          ? "Operational"
          : s.lastStatus === "degraded"
            ? "Degraded"
            : "Outage";

      return {
        slug: s.slug,
        name: s.name,
        category: s.category,
        lastCheckedAt: s.lastCheckedAt,
        state: stateLabel,
        tone:
          s.lastStatus === "degraded"
            ? ("warn" as const)
            : s.lastStatus === "outage"
              ? ("crit" as const)
              : ("" as const),
        ping: s.lastLatencyMs ? `${s.lastLatencyMs} ms` : "—",
        uptimePct: Number(s.uptime30dPct),
      };
    });

    const totalActive =
      operationalCount + degradedCount + outageCount === 0
        ? 0
        : operationalCount + degradedCount + outageCount;
    const uptime30d =
      rows.length === 0
        ? 100
        : rows.reduce((sum, s) => sum + Number(s.uptime30dPct), 0) / rows.length;

    return {
      services,
      operationalCount,
      degradedCount,
      outageCount,
      totalActive,
      uptime30dPct: uptime30d,
      p95LatencyMs: p95Latency || null,
      stripeDegradedSince,
    };
  }),
});

/* ----------------------------- Root ----------------------------- */

export const adminRouter = router({
  overview: overviewRouter,
  invoices: adminInvoicesRouter,
  audit: auditRouter,
  tickets: ticketsRouter,
  support: supportRouter,
  system: systemRouter,
  users: adminUsersRouter,
  teams: adminTeamsRouter,
  organizations: organizationsRouter,
  jobs: adminJobsRouter,
  trainings: adminTrainingsRouter,
  verifications: adminVerificationsRouter,
  pages: adminPagesRouter,
  faqs: adminFaqsRouter,
  settings: adminSettingsRouter,
  profileSettings: adminProfileSettingsRouter,
});
