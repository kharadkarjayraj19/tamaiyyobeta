import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DashboardLayoutProps = {
  /** Sticky top region (navbar) */
  topBar: ReactNode;
  /** Desktop sidebar column (hidden below `lg` — pair with mobile `Sheet`) */
  sidebar?: ReactNode;
  /** Primary content (typically wraps `PageContainer`) */
  children: ReactNode;
  className?: string;
};

/**
 * Two-column dashboard frame: top bar + (sidebar | main). Sidebar is `lg+` only;
 * pair with a `Sheet`-based drawer for mobile navigation.
 */
export function DashboardLayout({
  topBar,
  sidebar,
  children,
  className,
}: DashboardLayoutProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {topBar}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {sidebar ? (
          <aside
            className="hidden w-sidebar shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col"
          >
            {sidebar}
          </aside>
        ) : null}
        {children}
      </div>
    </div>
  );
}
