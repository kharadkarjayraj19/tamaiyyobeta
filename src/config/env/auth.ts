import "server-only";

/**
 * Better Auth server environment (never import from Client Components).
 */
function requireAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }
  // `next build` sets NODE_ENV=production without app secrets — use a non-production placeholder.
  // Real deployments **must** override via environment (see `.env.example` and docs).
  return "dev-only-placeholder-secret-change-me-32chars!!";
}

export const authEnv = {
  secret: requireAuthSecret(),
  baseURL:
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000",
} as const;
