import "server-only";

/**
 * Server-only secrets and configuration.
 * Never import this file from Client Components.
 */
export const serverEnv = {
  nodeEnv: process.env.NODE_ENV,
  betterAuthSecret: process.env.BETTER_AUTH_SECRET,
  betterAuthUrl: process.env.BETTER_AUTH_URL,
  authMiddlewareEnabled: process.env.AUTH_MIDDLEWARE_ENABLED,
  // Example placeholders for future wiring (uncomment when integrated):
  // databaseUrl: process.env.DATABASE_URL,
} as const;
