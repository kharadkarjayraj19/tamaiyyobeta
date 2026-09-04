import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";

import { auth } from "@/lib/auth/instance";
import { TAMAYO_SESSION_COOKIE } from "@/lib/auth/constants";
import { getPhoneSession } from "@/lib/auth/phone-session";

/**
 * Cached session lookup for the current request (RSC, Server Actions, route handlers).
 */
export const getSession = cache(async () => {
  const betterAuthSession = await auth.api.getSession({
    headers: await headers(),
  });

  if (betterAuthSession) {
    return betterAuthSession;
  }

  const cookieStore = await cookies();
  const phoneSessionToken = cookieStore.get(TAMAYO_SESSION_COOKIE)?.value;
  return getPhoneSession(phoneSessionToken);
});
