export const LOGIN_PATH = "/login" as const;
export const FORBIDDEN_PATH = "/forbidden" as const;

/** Dashboard URL prefixes aligned with `docs/architecture.md`. */
export const ROLE_PATH_PREFIXES = ["/customer", "/supplier", "/admin"] as const;

export type RolePathPrefix = (typeof ROLE_PATH_PREFIXES)[number];

export function isProtectedRolePath(pathname: string): boolean {
  return ROLE_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function buildLoginRedirect(pathname: string, requestUrl: string): URL {
  const url = new URL(LOGIN_PATH, requestUrl);
  if (pathname && pathname !== LOGIN_PATH) {
    url.searchParams.set("callbackUrl", pathname);
  }
  return url;
}
