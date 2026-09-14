import "server-only";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { authEnv } from "@/config/env/auth";

/**
 * Better Auth instance — **server-only** import surface.
 *
 * - **Stateless foundation:** no primary `database` adapter yet; sessions use signed cookie cache
 *   per Better Auth stateless defaults. Add Drizzle/Prisma/SQL when persistence is required.
 * - **Google OAuth:** currently handled via custom `/api/v1/auth/google/*` routes while
 *   keeping `tamayo.session_token` session fallback aligned with booking flows.
 * - **OTP / magic link:** add official plugins when product specs land.
 *
 * @see https://www.better-auth.com/docs/concepts/session-management#stateless-session-management
 */
export const auth = betterAuth({
  secret: authEnv.secret,
  baseURL: authEnv.baseURL,
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7,
      strategy: "compact",
      refreshCache: true,
    },
  },
  account: {
    storeStateStrategy: "cookie",
    storeAccountCookie: true,
  },
  emailAndPassword: {
    enabled: false,
  },
  plugins: [nextCookies()],
});
