"use client";

import Link from "next/link";

import type { NavItemConfig } from "@/config/navigation";
import { uiLayout } from "@/config/ui";
import { cn } from "@/lib/utils";

import { NavIcon } from "./nav-icon";

type NavLinkProps = {
  item: NavItemConfig;
  pathname: string | null;
  onNavigate?: () => void;
};

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (pathname === href) return true;
  if (href === "/") return false;
  return pathname.startsWith(`${href}/`);
}

export function NavLink({ item, pathname, onNavigate }: NavLinkProps) {
  const active = isActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        uiLayout.navLinkBase,
        active
          ? "bg-accent text-accent-foreground"
          : "text-sidebar-foreground hover:bg-accent/60 hover:text-accent-foreground"
      )}
      aria-current={active ? "page" : undefined}
    >
      <NavIcon name={item.icon} />
      <span>{item.title}</span>
    </Link>
  );
}
