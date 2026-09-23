"use client";

import { type ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogIn, LogOut, Menu } from "lucide-react";

import type { AppRole } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { uiLayout } from "@/config/ui";
import { Button } from "@/components/ui/button";
import { TAMAYO_SESSION_COOKIE } from "@/lib/auth/constants";
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
 * Sticky top bar: mobile menu/back control, brand/role context, and sign-out action.
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
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const isCustomer = role === "customer";

  useEffect(() => {
    function syncAuthStateFromCookie() {
      const cookie = document.cookie;
      setHasSession(
        cookie.includes(`${TAMAYO_SESSION_COOKIE}=`) || cookie.includes("better-auth.session_token=")
      );
    }

    syncAuthStateFromCookie();
    window.addEventListener("focus", syncAuthStateFromCookie);
    document.addEventListener("visibilitychange", syncAuthStateFromCookie);
    return () => {
      window.removeEventListener("focus", syncAuthStateFromCookie);
      document.removeEventListener("visibilitychange", syncAuthStateFromCookie);
    };
  }, []);

  function handleBackNavigation() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/customer");
  }

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  function handleAuthAction() {
    if (hasSession) {
      void handleSignOut();
      return;
    }

    router.push("/login?callbackUrl=%2Fcustomer");
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
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          className="h-8 gap-1.5 rounded-full bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 shadow-none hover:bg-emerald-100 hover:text-emerald-900"
          onClick={handleAuthAction}
          disabled={isSigningOut}
          aria-label={hasSession ? "Sign out" : "Sign in"}
        >
          {hasSession ? <LogOut className="h-3.5 w-3.5" aria-hidden /> : <LogIn className="h-3.5 w-3.5" aria-hidden />}
          <span>{hasSession ? (isSigningOut ? "Signing out..." : "Sign out") : "Sign in"}</span>
        </Button>
        {trailing ? <div className="flex items-center gap-2">{trailing}</div> : null}
      </div>
    </header>
  );
}
