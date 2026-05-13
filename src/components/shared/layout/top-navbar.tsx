"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import type { AppRole } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { uiLayout } from "@/config/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ROLE_TITLE: Record<AppRole, string> = {
  customer: "Customer",
  supplier: "Supplier",
  admin: "Admin",
};

type TopNavbarProps = {
  role: AppRole;
  onOpenSidebar: () => void;
  trailing?: ReactNode;
  className?: string;
};

/**
 * Sticky top bar: mobile menu, home link, role context. No auth controls (by design).
 */
export function TopNavbar({ role, onOpenSidebar, trailing, className }: TopNavbarProps) {
  return (
    <header className={cn(uiLayout.topBar, className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0 lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </Button>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link
          href="/"
          className="truncate text-sm font-semibold tracking-tight text-foreground hover:underline"
        >
          {siteConfig.name}
        </Link>
        <span className="text-muted-foreground" aria-hidden>
          /
        </span>
        <span className="truncate text-sm text-muted-foreground">{ROLE_TITLE[role]}</span>
      </div>
      {trailing ? <div className="flex shrink-0 items-center gap-2">{trailing}</div> : null}
    </header>
  );
}
