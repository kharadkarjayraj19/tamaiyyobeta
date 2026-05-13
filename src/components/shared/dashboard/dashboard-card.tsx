import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardCardProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

/**
 * Metric / summary card for dashboards — presentational only.
 */
export function DashboardCard({ title, description, children, className }: DashboardCardProps) {
  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {children ? <CardContent className="pt-0">{children}</CardContent> : null}
    </Card>
  );
}
