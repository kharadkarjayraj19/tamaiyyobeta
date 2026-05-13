import type { ReactNode } from "react";

import { RoleDashboardShell } from "@/components/shared/layout/role-dashboard-shell";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return <RoleDashboardShell role="customer">{children}</RoleDashboardShell>;
}
