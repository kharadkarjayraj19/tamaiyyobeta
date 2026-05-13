import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Root chrome wrapper: full-height column, background from tokens.
 */
export function AppShell({ children, className }: AppShellProps) {
  return (
    <div className={cn("flex min-h-screen flex-col bg-background", className)}>{children}</div>
  );
}
