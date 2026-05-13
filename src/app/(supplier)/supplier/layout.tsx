import type { ReactNode } from "react";

import { RoleDashboardShell } from "@/components/shared/layout/role-dashboard-shell";

export default function SupplierLayout({ children }: { children: ReactNode }) {
  return <RoleDashboardShell role="supplier">{children}</RoleDashboardShell>;
}
