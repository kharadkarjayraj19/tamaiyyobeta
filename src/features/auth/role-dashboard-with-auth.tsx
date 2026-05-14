import type { ReactNode } from "react";

import type { AppRole } from "@/config/navigation";
import { RoleDashboardShell } from "@/components/shared/layout/role-dashboard-shell";
import { requireSession } from "@/lib/auth/require-session";
import { toSessionBridge } from "@/lib/auth/session-bridge";

import { SessionBridgeProvider } from "./session-bridge-provider";

type RoleDashboardWithAuthProps = {
  role: AppRole;
  /** Path used for post-login return (`callbackUrl`) — typically the role root. */
  sessionPath: string;
  children: ReactNode;
};

/**
 * Server wrapper: enforces session, exposes a minimal client session bridge, renders the role shell.
 */
export async function RoleDashboardWithAuth({
  role,
  sessionPath,
  children,
}: RoleDashboardWithAuthProps) {
  const session = await requireSession(sessionPath);

  return (
    <SessionBridgeProvider value={toSessionBridge(session)}>
      <RoleDashboardShell role={role}>{children}</RoleDashboardShell>
    </SessionBridgeProvider>
  );
}
