import type { ReactNode } from "react";

import { RoleShell } from "@/components/shared/role-shell";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return <RoleShell role="Customer">{children}</RoleShell>;
}
