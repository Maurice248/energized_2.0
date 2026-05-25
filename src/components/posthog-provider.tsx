"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { authClient } from "@/lib/auth/client";
import { api } from "@/lib/trpc/client";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;
// Skip PostHog entirely in dev to keep the console clean — local testing
// shouldn't push events to the production analytics project, and PostHog's
// ingest endpoint occasionally 500s, spamming the console.
const ENABLED =
  Boolean(KEY) && process.env.NODE_ENV === "production";
let initialized = false;

function ensureInit() {
  if (initialized || !ENABLED || !KEY || typeof window === "undefined")
    return;
  posthog.init(KEY, {
    api_host: HOST ?? "https://us.i.posthog.com",
    capture_pageview: false,
    person_profiles: "identified_only",
  });
  initialized = true;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const session = authClient.useSession();
  const me = api.account.me.useQuery(undefined, {
    enabled: Boolean(session.data?.user),
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    ensureInit();
  }, []);

  useEffect(() => {
    if (!initialized || !session.data?.user || !me.data) return;
    posthog.identify(me.data.id, {
      email: me.data.email,
      role: me.data.role,
    });
  }, [me.data, session.data?.user]);

  useEffect(() => {
    if (!initialized) return;
    const url =
      pathname +
      (searchParams.toString() ? `?${searchParams.toString()}` : "");
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return <>{children}</>;
}
