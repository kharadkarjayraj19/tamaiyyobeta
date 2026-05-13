import { LayoutDashboard, type LucideIcon } from "lucide-react";

import type { NavIconKey } from "@/config/navigation";
import { cn } from "@/lib/utils";

const iconMap: Record<NavIconKey, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
};

export function NavIcon({ name, className }: { name: NavIconKey; className?: string }) {
  const Icon = iconMap[name];
  return <Icon className={cn("h-4 w-4 shrink-0", className)} aria-hidden />;
}
