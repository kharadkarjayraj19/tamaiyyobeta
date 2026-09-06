import { NextResponse, type NextRequest } from "next/server";

import { buildLoginRedirect, isProtectedRolePath } from "@/lib/auth/guards";
import { TAMAYO_SESSION_COOKIE } from "@/lib/auth/constants";

const authMiddlewareEnabled = process.env.AUTH_MIDDLEWARE_ENABLED !== "false";
const devAuthBypassEnabled =
  process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS === "true";

/**
 * Optimistic cookie presence check (Edge-safe): does not validate the session.
 * Matches Better Auth default session cookie naming / chunking prefix.
 *
 * @see https://www.better-auth.com/docs/integrations/next
 */
function hasLikelyBetterAuthSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => {
    return (
      name.startsWith("better-auth.session_token") ||
      name === TAMAYO_SESSION_COOKIE
    );
  });
}

/**
 * Optimistic cookie presence check for role dashboards.
 * Authoritative session validation still happens in Server Components (`getSession`).
 */
export function middleware(request: NextRequest) {
  if (!authMiddlewareEnabled) {
    return NextResponse.next();
  }

  if (devAuthBypassEnabled) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  // Progressive auth: customer browsing is open, login is enforced at reserve/payment actions.
  if (pathname === "/customer" || pathname.startsWith("/customer/")) {
    return NextResponse.next();
  }
  if (!isProtectedRolePath(pathname)) {
    return NextResponse.next();
  }

  if (!hasLikelyBetterAuthSessionCookie(request)) {
    const url = buildLoginRedirect(pathname, request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/supplier/:path*", "/admin/:path*"],
};
