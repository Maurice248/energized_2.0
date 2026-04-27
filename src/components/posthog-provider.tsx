"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { api } from "@/lib/trpc/client";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;
let initialized = false;

function ensureInit() {
  if (initialized || !KEY || typeof window === "undefined") return;
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
  const me = api.account.me.useQuery(undefined, {
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    ensureInit();
  }, []);

  useEffect(() => {
    if (!initialized || !me.data) return;
    posthog.identify(me.data.id, {
      email: me.data.email,
      role: me.data.role,
    });
  }, [me.data]);

  useEffect(() => {
    if (!initialized) return;
    const url =
      pathname +
      (searchParams.toString() ? `?${searchParams.toString()}` : "");
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return <>{children}</>;
}
