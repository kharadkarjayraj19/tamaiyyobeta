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
  databaseUrl: process.env.DATABASE_URL,
  posthogProjectApiKey:
    process.env.POSTHOG_PROJECT_API_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY,
  posthogHost: process.env.POSTHOG_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST,
} as const;

// Runtime validation for required database configuration
if (!serverEnv.databaseUrl && serverEnv.nodeEnv !== "development") {
  throw new Error(
    "DATABASE_URL is required for production deployments. See .env.example for setup."
  );
}
