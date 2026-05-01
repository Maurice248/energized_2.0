import { NextResponse, type NextRequest } from "next/server";

// Edge middleware does fast cookie-based gating before the request hits the
// route layout. It only checks for the session cookie's presence — full
// session validation still happens in route layouts via getSession(). The goal
// here is to short-circuit obvious unauth/auth navigations and avoid the
// cost of rendering a layout just to redirect.

const APP_PREFIXES = [
  "/dashboard",
  "/applications",
  "/saved",
  "/employer",
  "/candidates",
  "/notifications",
  "/profile",
  "/account",
  "/shortlist",
  "/saved-searches",
];

const AUTH_PREFIXES = ["/sign-in", "/sign-up"];

export const config = {
  // Skip Next internals, static files, all API routes (auth, tRPC, stripe,
  // trigger), and anything else served from /_next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const sessionCookie =
    req.cookies.get("better-auth.session_token") ||
    req.cookies.get("__Secure-better-auth.session_token");
  const hasSession = Boolean(sessionCookie?.value);

  const isAppRoute = APP_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAuthRoute = AUTH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isAppRoute && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
