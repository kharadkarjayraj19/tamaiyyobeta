/**
 * Client-safe environment values (`NEXT_PUBLIC_*` only).
 * Import this from Client Components or shared modules that may run on the client.
 */
export const clientEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;
