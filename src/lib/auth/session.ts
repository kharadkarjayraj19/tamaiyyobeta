import "server-only";
import { cache } from "react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth/instance";

/**
 * Cached session lookup for the current request (RSC, Server Actions, route handlers).
 */
export const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});
