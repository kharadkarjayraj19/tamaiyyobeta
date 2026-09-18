"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";

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
  showMenuButton?: boolean;
  showBackButton?: boolean;
  trailing?: ReactNode;
  className?: string;
};

/**
 * Sticky top bar: mobile menu, home link, role context. No auth controls (by design).
 */
export function TopNavbar({
  role,
  onOpenSidebar,
  showMenuButton = true,
  showBackButton = false,
  trailing,
  className,
}: TopNavbarProps) {
  const router = useRouter();
  const isCustomer = role === "customer";

  function handleBackNavigation() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/customer");
  }

  return (
    <header className={cn(uiLayout.topBar, className)}>
      {showBackButton ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-ml-1 -mt-0.5 h-8 w-8 shrink-0 rounded-md p-0 text-slate-600 shadow-none hover:bg-slate-100/70 lg:hidden"
          onClick={handleBackNavigation}
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Button>
      ) : showMenuButton ? (
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
      ) : null}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {isCustomer ? (
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/images/tamayo-logo.png"
              alt="Tamayo"
              width={180}
              height={52}
              className="h-7 w-auto"
              priority
            />
          </Link>
        ) : (
          <Link
            href="/"
            className="truncate text-sm font-semibold tracking-tight text-foreground hover:underline"
          >
            {siteConfig.name}
          </Link>
        )}
        {isCustomer ? null : (
          <>
            <span className="text-muted-foreground" aria-hidden>
              /
            </span>
            <span className="truncate text-sm text-muted-foreground">{ROLE_TITLE[role]}</span>
          </>
        )}
      </div>
      {trailing ? <div className="flex shrink-0 items-center gap-2">{trailing}</div> : null}
    </header>
  );
}
