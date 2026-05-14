import type { ReactNode } from "react";

import { RoleDashboardWithAuth } from "@/features/auth/role-dashboard-with-auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleDashboardWithAuth role="admin" sessionPath="/admin">
      {children}
    </RoleDashboardWithAuth>
  );
}
