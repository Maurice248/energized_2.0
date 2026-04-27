import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/api/root";
import { createContext } from "@/server/api/trpc";
import { env } from "@/env";

const stripTrailingSlash = (s: string) => s.replace(/\/+$/, "");
const ALLOWED_ORIGINS = new Set(
  [env.NEXT_PUBLIC_APP_URL, env.BETTER_AUTH_URL].map(stripTrailingSlash),
);

function isOriginAllowed(req: Request): boolean {
  if (req.method === "GET" || req.method === "HEAD") return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  return ALLOWED_ORIGINS.has(stripTrailingSlash(origin));
}

const handler = (req: Request) => {
  if (!isOriginAllowed(req)) {
    return new Response("forbidden_origin", { status: 403 });
  }
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    onError({ error, path }) {
      if (process.env.NODE_ENV === "development") {
        console.error(`tRPC error on ${path ?? "<unknown>"}:`, error);
      }
    },
  });
};

export { handler as GET, handler as POST };
