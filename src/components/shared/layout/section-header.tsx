import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Separator } from "@/components/ui/separator";

type SectionHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

/**
 * Page / section title block with optional actions (filters, buttons).
 */
export function SectionHeader({ title, description, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <Separator />
    </div>
  );
}
