import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;

export function getPostHogClient(): PostHog {
  if (!posthogClient) {
    posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogClient;
}

export async function shutdownPostHog(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown();
  }
}

type CaptureArgs = {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
};

/**
 * Fire-and-forget event capture. No-ops when the public key is missing
 * (e.g. local dev without PostHog), and swallows errors so a flaky
 * analytics outage cannot break a tRPC mutation.
 */
export async function safeCapture({
  distinctId,
  event,
  properties,
}: CaptureArgs): Promise<void> {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    const client = getPostHogClient();
    client.capture({ distinctId, event, properties });
  } catch (e) {
    console.warn("[posthog] capture failed:", e);
  }
}

export type TopPageRow = { path: string; views: number; spark: number[] };

/**
 * Pull the top N pages over the last 7 days from PostHog via HogQL.
 * Requires `POSTHOG_PROJECT_ID` and `POSTHOG_PERSONAL_API_KEY`. Returns
 * an empty array when those env vars are missing (or the API call fails),
 * so the admin UI degrades gracefully.
 */
export async function fetchTopPages(limit = 5): Promise<TopPageRow[]> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!projectId || !apiKey || !host) return [];

  try {
    const res = await fetch(
      `${host.replace(/\/$/, "")}/api/projects/${projectId}/query/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query: {
            kind: "HogQLQuery",
            query: `
              SELECT properties.$pathname AS path,
                     count() AS views,
                     toStartOfDay(timestamp) AS day
              FROM events
              WHERE event = '$pageview'
                AND timestamp > now() - INTERVAL 7 DAY
                AND properties.$pathname IS NOT NULL
              GROUP BY path, day
              ORDER BY views DESC
              LIMIT ${limit * 7}
            `,
          },
        }),
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: [string, number, string][];
    };
    const rows = data.results ?? [];
    const byPath = new Map<string, { total: number; days: Map<string, number> }>();
    for (const [path, views, day] of rows) {
      if (!path) continue;
      const entry = byPath.get(path) ?? { total: 0, days: new Map() };
      entry.total += Number(views);
      entry.days.set(day, (entry.days.get(day) ?? 0) + Number(views));
      byPath.set(path, entry);
    }
    return Array.from(byPath.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, limit)
      .map(([path, info]) => ({
        path,
        views: info.total,
        spark: Array.from(info.days.entries())
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([, v]) => v),
      }));
  } catch (e) {
    console.warn("[posthog] fetchTopPages failed:", e);
    return [];
  }
}
