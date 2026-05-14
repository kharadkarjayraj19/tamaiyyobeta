import "server-only";

import { redirect } from "next/navigation";

import { LOGIN_PATH } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";

/**
 * Ensures a Better Auth session exists before rendering a protected layout tree.
 * Complements optimistic `middleware` cookie checks with a server session read.
 */
export async function requireSession(callbackUrlPath: string) {
  const session = await getSession();
  if (!session) {
    const search = new URLSearchParams({ callbackUrl: callbackUrlPath });
    redirect(`${LOGIN_PATH}?${search.toString()}`);
  }
  return session;
}
