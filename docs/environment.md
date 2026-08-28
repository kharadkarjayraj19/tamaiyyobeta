# Tamayo — environment variables

Copy `.env.example` to `.env.local` for local development. Next.js loads `.env.local` automatically (and never commits it).

## Naming

| Prefix | Where to read | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_` | `src/config/env/client.ts` | Values exposed to the browser. Never put secrets here. |
| (none) | `src/config/env/server.ts` | Secrets and infrastructure config. Server-only via `server-only`. |

## Current keys

- `NEXT_PUBLIC_APP_URL` — canonical public site URL (used for absolute links, callbacks, and similar patterns).
- `BETTER_AUTH_SECRET` — Better Auth signing secret (≥32 chars in real environments; see `src/config/env/auth.ts`).
- `BETTER_AUTH_URL` — origin passed to Better Auth (defaults to `NEXT_PUBLIC_APP_URL` when unset).
- `AUTH_MIDDLEWARE_ENABLED` — set to `false` to disable optimistic middleware redirects (local only).

Details for the auth stack: **[features/frontend-auth-architecture.md](./features/frontend-auth-architecture.md)**.

Add new variables in `.env.example` first, then wire them in `client.ts`, `server.ts`, or `config/env/auth.ts` as appropriate.
