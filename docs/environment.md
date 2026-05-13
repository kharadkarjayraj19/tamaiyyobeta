# Tamaiyyo — environment variables

Copy `.env.example` to `.env.local` for local development. Next.js loads `.env.local` automatically (and never commits it).

## Naming

| Prefix | Where to read | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_` | `src/config/env/client.ts` | Values exposed to the browser. Never put secrets here. |
| (none) | `src/config/env/server.ts` | Secrets and infrastructure config. Server-only via `server-only`. |

## Current keys

- `NEXT_PUBLIC_APP_URL` — canonical public site URL (used for absolute links, callbacks, and similar patterns).

Add new variables in `.env.example` first, then wire them in `client.ts` or `server.ts` as appropriate.
