import type { ReactNode } from "react";

import { RoleShell } from "@/components/shared/role-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RoleShell role="Admin">{children}</RoleShell>;
}
