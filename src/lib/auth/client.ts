"use client";

import { createAuthClient } from "better-auth/react";

import { clientEnv } from "@/config/env/client";

/**
 * Better Auth React client — import **only** from Client Components when needed.
 * Prefer `getSession()` from `@/lib/auth/session` in Server Components.
 */
export const authClient = createAuthClient({
  baseURL: clientEnv.appUrl,
});
