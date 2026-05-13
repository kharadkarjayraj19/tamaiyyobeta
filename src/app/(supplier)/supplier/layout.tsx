import type { ReactNode } from "react";

import { RoleShell } from "@/components/shared/role-shell";

export default function SupplierLayout({ children }: { children: ReactNode }) {
  return <RoleShell role="Supplier">{children}</RoleShell>;
}
