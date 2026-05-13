import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DataTableShellProps = {
  /** Toolbar row above the table (filters, export, etc.) */
  toolbar?: ReactNode;
  /** Typically a `<table>` with `thead` / `tbody` */
  children: ReactNode;
  /** Footer region (pagination, summary) */
  footer?: ReactNode;
  className?: string;
};

/**
 * Operational table wrapper: border, overflow-x, optional toolbar/footer slots.
 * Does not render table semantics — consumers own `<table>` structure.
 */
export function DataTableShell({ toolbar, children, footer, className }: DataTableShellProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm",
        className
      )}
    >
      {toolbar ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          {toolbar}
        </div>
      ) : null}
      <div className="overflow-x-auto">{children}</div>
      {footer ? (
        <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
