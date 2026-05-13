"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import type { AppRole } from "@/config/navigation";
import { getNavigationForRole } from "@/config/navigation";
import { uiLayout } from "@/config/ui";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { AppShell } from "./app-shell";
import { DashboardLayout } from "./dashboard-layout";
import { MAIN_CONTENT_ID } from "./main-content-id";
import { PageContainer } from "./page-container";
import { Sidebar } from "./sidebar";
import { SkipToContent } from "./skip-to-content";
import { TopNavbar } from "./top-navbar";

type RoleDashboardShellProps = {
  role: AppRole;
  children: ReactNode;
};

/**
 * Role-aware application shell: skip link, responsive nav (drawer + sidebar),
 * sticky top bar, scrollable main. No business logic — navigation from `src/config/navigation.ts`.
 */
export function RoleDashboardShell({ role, children }: RoleDashboardShellProps) {
  const pathname = usePathname();
  const items = useMemo(() => getNavigationForRole(role), [role]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <AppShell>
        <SkipToContent />
        <DashboardLayout
          topBar={
            <TopNavbar role={role} onOpenSidebar={() => setMobileNavOpen(true)} />
          }
          sidebar={<Sidebar role={role} items={items} pathname={pathname} />}
        >
          <main
            id={MAIN_CONTENT_ID}
            tabIndex={-1}
            className={cn(uiLayout.mainScroll, "bg-background outline-none")}
          >
            <PageContainer variant="wide">{children}</PageContainer>
          </main>
        </DashboardLayout>
      </AppShell>
      <SheetContent
        side="left"
        className="w-sidebar border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetHeader className="border-b border-sidebar-border px-4 py-4 text-left">
          <SheetTitle className="text-base font-semibold text-sidebar-foreground">
            Navigation
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Primary links for this area of the product.
          </SheetDescription>
        </SheetHeader>
        <Sidebar
          role={role}
          items={items}
          pathname={pathname}
          onNavigate={() => setMobileNavOpen(false)}
          className="border-0 bg-transparent pt-2"
        />
      </SheetContent>
    </Sheet>
  );
}
