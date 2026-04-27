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
