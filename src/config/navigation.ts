/**
 * Serializable primary navigation per role (no React icons here — safe for server imports).
 * Extend arrays as new routes ship; keep labels neutral until product copy exists.
 */
export type AppRole = "customer" | "supplier" | "admin";

export type NavIconKey = "layout-dashboard" | "calculator" | "route";

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
  customer: [
    overview("/customer"),
    {
      title: "Quote Builder",
      href: "/customer/booking-quote",
      icon: "calculator",
    },
  ],
  supplier: [overview("/supplier")],
  admin: [
    overview("/admin"),
    {
      title: "One-way Corridors",
      href: "/admin/one-way-corridors",
      icon: "route",
    },
  ],
};

export function getNavigationForRole(role: AppRole): NavItemConfig[] {
  return navigationByRole[role];
}
