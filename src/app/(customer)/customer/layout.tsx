import type { ReactNode } from "react";

import { RoleDashboardWithAuth } from "@/features/auth/role-dashboard-with-auth";

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <RoleDashboardWithAuth role="customer" sessionPath="/customer">
      {children}
    </RoleDashboardWithAuth>
  );
}
