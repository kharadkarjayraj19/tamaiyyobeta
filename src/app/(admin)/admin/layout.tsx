import type { ReactNode } from "react";

import { RoleDashboardShell } from "@/components/shared/layout/role-dashboard-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RoleDashboardShell role="admin">{children}</RoleDashboardShell>;
}
