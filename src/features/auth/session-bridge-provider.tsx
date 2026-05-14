"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { SessionBridge } from "@/lib/auth/session-bridge";

const SessionBridgeContext = createContext<SessionBridge>(null);

/**
 * Minimal client bridge for session-aware UI (e.g. future `TopNavbar` user menu).
 * Populated from the root layout via `toSessionBridge(getSession())`.
 */
export function SessionBridgeProvider({
  value,
  children,
}: {
  value: SessionBridge;
  children: ReactNode;
}) {
  return (
    <SessionBridgeContext.Provider value={value}>{children}</SessionBridgeContext.Provider>
  );
}

export function useSessionBridge(): SessionBridge {
  return useContext(SessionBridgeContext);
}
