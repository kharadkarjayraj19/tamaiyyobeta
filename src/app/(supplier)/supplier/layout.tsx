import type { ReactNode } from "react";

import { RoleDashboardWithAuth } from "@/features/auth/role-dashboard-with-auth";

export default async function SupplierLayout({ children }: { children: ReactNode }) {
  return (
    <RoleDashboardWithAuth role="supplier" sessionPath="/supplier">
      {children}
    </RoleDashboardWithAuth>
  );
}
