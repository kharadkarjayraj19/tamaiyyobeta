import { NextResponse, type NextRequest } from "next/server";

import { buildLoginRedirect, isProtectedRolePath } from "@/lib/auth/guards";

const authMiddlewareEnabled = process.env.AUTH_MIDDLEWARE_ENABLED !== "false";

/**
 * Optimistic cookie presence check (Edge-safe): does not validate the session.
 * Matches Better Auth default session cookie naming / chunking prefix.
 *
 * @see https://www.better-auth.com/docs/integrations/next
 */
function hasLikelyBetterAuthSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => name.startsWith("better-auth.session_token"));
}

/**
 * Optimistic cookie presence check for role dashboards.
 * Authoritative session validation still happens in Server Components (`getSession`).
 */
export function middleware(request: NextRequest) {
  if (!authMiddlewareEnabled) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
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
  matcher: ["/customer/:path*", "/supplier/:path*", "/admin/:path*"],
};
