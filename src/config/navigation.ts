/**
 * Serializable primary navigation per role (no React icons here — safe for server imports).
 * Extend arrays as new routes ship; keep labels neutral until product copy exists.
 */
export type AppRole = "customer" | "supplier" | "admin";

export type NavIconKey = "layout-dashboard";

export type NavItemConfig = {
  title: string;
  href: string;
  icon: NavIconKey;
};

const overview = (prefix: `/${string}`): NavItemConfig => ({
  title: "Overview",
  href: prefix,
  icon: "layout-dashboard",
});

export const navigationByRole: Record<AppRole, NavItemConfig[]> = {
  customer: [overview("/customer")],
  supplier: [overview("/supplier")],
  admin: [overview("/admin")],
};

export function getNavigationForRole(role: AppRole): NavItemConfig[] {
  return navigationByRole[role];
}
