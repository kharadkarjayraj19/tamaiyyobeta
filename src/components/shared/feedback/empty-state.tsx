import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
};

/**
 * Neutral empty state — copy should come from feature specs when product exists.
 */
export function EmptyState({ title, description, icon: Icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center",
        className
      )}
    >
      {Icon ? <Icon className="h-10 w-10 text-muted-foreground" aria-hidden /> : null}
      <div className="space-y-1">
        <p className="text-base font-medium text-foreground">{title}</p>
        {description ? <p className="max-w-md text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
