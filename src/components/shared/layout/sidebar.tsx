"use client";

import type { AppRole, NavItemConfig } from "@/config/navigation";
import { uiLayout } from "@/config/ui";
import { cn } from "@/lib/utils";

import { NavLink } from "./nav-link";

const ROLE_NAV_LABEL: Record<AppRole, string> = {
  customer: "Customer",
  supplier: "Supplier",
  admin: "Admin",
};

type SidebarProps = {
  role: AppRole;
  items: NavItemConfig[];
  pathname: string | null;
  onNavigate?: () => void;
  className?: string;
};

/**
 * Primary sidebar / drawer navigation list (role-agnostic markup; items from config).
 */
export function Sidebar({ role, items, pathname, onNavigate, className }: SidebarProps) {
  return (
    <nav
      className={cn(uiLayout.sidebarPad, className)}
      aria-label={`${ROLE_NAV_LABEL[role]} primary navigation`}
    >
      <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {ROLE_NAV_LABEL[role]}
      </p>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </div>
    </nav>
  );
}
