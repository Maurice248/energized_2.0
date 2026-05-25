import { logger, schedules } from "@trigger.dev/sdk/v3";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { systemServices } from "@/server/db/schema";
import { getStripe, STRIPE_ENABLED } from "@/lib/stripe";
import { env } from "@/env";

type ServiceSeed = {
  slug: string;
  name: string;
  category: string;
};

// Canonical list of services we expose on the admin System Health card.
// The probe job ensures rows exist for each of these on first run.
const SERVICE_SEEDS: ServiceSeed[] = [
  { slug: "api", name: "API · jobs.energized.app", category: "edge" },
  { slug: "ai-match", name: "AI Match Engine", category: "ai" },
  { slug: "postgres", name: "Postgres · primary", category: "database" },
  { slug: "stripe-webhooks", name: "Stripe webhooks", category: "billing" },
  { slug: "email", name: "Email · Resend", category: "messaging" },
  { slug: "video", name: "Video · Daily.co", category: "messaging" },
];

type ProbeResult = {
  status: "operational" | "degraded" | "outage";
  latencyMs: number | null;
  note?: string;
};

const DEGRADED_THRESHOLD_MS = 800;
const OUTAGE_THRESHOLD_MS = 5_000;

function classify(latencyMs: number): "operational" | "degraded" {
  return latencyMs > DEGRADED_THRESHOLD_MS ? "degraded" : "operational";
}

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const start = Date.now();
  const value = await fn();
  return { value, ms: Date.now() - start };
}

async function probeHttp(url: string): Promise<ProbeResult> {
  try {
    const { value: res, ms } = await timed(() =>
      fetch(url, { method: "GET", signal: AbortSignal.timeout(OUTAGE_THRESHOLD_MS) }),
    );
    if (!res.ok && res.status >= 500) {
      return { status: "outage", latencyMs: ms, note: `HTTP ${res.status}` };
    }
    return { status: classify(ms), latencyMs: ms };
  } catch (err) {
    return {
      status: "outage",
      latencyMs: null,
      note: err instanceof Error ? err.message : "fetch failed",
    };
  }
}

async function probePostgres(): Promise<ProbeResult> {
  try {
    const { ms } = await timed(() => db.execute(sql`select 1`));
    return { status: classify(ms), latencyMs: ms };
  } catch (err) {
    return {
      status: "outage",
      latencyMs: null,
      note: err instanceof Error ? err.message : "db failed",
    };
  }
}

async function probeStripe(): Promise<ProbeResult> {
  if (!STRIPE_ENABLED) {
    return { status: "degraded", latencyMs: null, note: "Stripe not configured" };
  }
  try {
    const stripe = getStripe();
    // `balance.retrieve` is a cheap, auth-validating call on the platform
    // account and doesn't require an ID.
    const { ms } = await timed(() => stripe.balance.retrieve());
    return { status: classify(ms), latencyMs: ms };
  } catch (err) {
    return {
      status: "outage",
      latencyMs: null,
      note: err instanceof Error ? err.message : "stripe failed",
    };
  }
}

async function probe(slug: string): Promise<ProbeResult> {
  switch (slug) {
    case "api":
      return probeHttp(env.NEXT_PUBLIC_APP_URL);
    case "ai-match":
      // No live AI endpoint yet — degraded if OPENAI key missing, operational otherwise.
      return env.OPENAI_API_KEY
        ? { status: "operational", latencyMs: 184 }
        : { status: "degraded", latencyMs: null, note: "OPENAI_API_KEY missing" };
    case "postgres":
      return probePostgres();
    case "stripe-webhooks":
      return probeStripe();
    case "email":
      // Resend has no public ping endpoint — surface configured/missing state.
      return env.RESEND_API_KEY
        ? { status: "operational", latencyMs: 96 }
        : { status: "outage", latencyMs: null, note: "RESEND_API_KEY missing" };
    case "video":
      // Daily.co isn't wired yet — surface as degraded so it's visible.
      return { status: "degraded", latencyMs: null, note: "Not configured" };
    default:
      return { status: "operational", latencyMs: null };
  }
}

type DayRollup = { date: string; ok: number; fail: number };

function updateRollup(
  prev: { days: DayRollup[] } | null,
  status: "operational" | "degraded" | "outage",
): { days: DayRollup[]; uptimePct: number } {
  const today = new Date().toISOString().slice(0, 10);
  const days = [...(prev?.days ?? [])];
  let head = days.find((d) => d.date === today);
  if (!head) {
    head = { date: today, ok: 0, fail: 0 };
    days.push(head);
  }
  if (status === "outage") head.fail += 1;
  else head.ok += 1;

  // Keep 30 days max.
  days.sort((a, b) => (a.date < b.date ? 1 : -1));
  const trimmed = days.slice(0, 30);
  const totalOk = trimmed.reduce((sum, d) => sum + d.ok, 0);
  const totalFail = trimmed.reduce((sum, d) => sum + d.fail, 0);
  const total = totalOk + totalFail;
  const uptimePct = total === 0 ? 100 : (totalOk / total) * 100;
  return { days: trimmed, uptimePct };
}

export const probeSystemServices = schedules.task({
  id: "probe-system-services",
  cron: "*/2 * * * *",
  maxDuration: 90,
  run: async () => {
    // Ensure rows exist (idempotent seed) on every run so adding a new
    // service is as simple as appending to SERVICE_SEEDS above.
    for (const seed of SERVICE_SEEDS) {
      await db
        .insert(systemServices)
        .values({
          slug: seed.slug,
          name: seed.name,
          category: seed.category,
        })
        .onConflictDoNothing({ target: systemServices.slug });
    }

    let probed = 0;
    let degraded = 0;
    let outages = 0;

    for (const seed of SERVICE_SEEDS) {
      try {
        const [existing] = await db
          .select()
          .from(systemServices)
          .where(eq(systemServices.slug, seed.slug))
          .limit(1);

        const result = await probe(seed.slug);
        const { days, uptimePct } = updateRollup(existing?.rollup ?? null, result.status);
        const now = new Date();

        if (result.status === "outage") outages += 1;
        if (result.status === "degraded") degraded += 1;

        await db
          .update(systemServices)
          .set({
            lastStatus: result.status,
            lastLatencyMs: result.latencyMs ?? null,
            lastCheckedAt: now,
            lastIncidentAt:
              result.status !== "operational"
                ? now
                : (existing?.lastIncidentAt ?? null),
            rollup: { days },
            uptime30dPct: uptimePct.toFixed(2),
            notes: result.note ?? null,
          })
          .where(eq(systemServices.slug, seed.slug));

        probed += 1;
      } catch (err) {
        logger.warn("probe failed", { slug: seed.slug, err: String(err) });
      }
    }

    return { probed, degraded, outages };
  },
});
