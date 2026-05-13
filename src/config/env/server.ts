import "server-only";

/**
 * Server-only secrets and configuration.
 * Never import this file from Client Components.
 */
export const serverEnv = {
  nodeEnv: process.env.NODE_ENV,
  // Example placeholders for future wiring (uncomment when integrated):
  // databaseUrl: process.env.DATABASE_URL,
  // authSecret: process.env.AUTH_SECRET,
} as const;
