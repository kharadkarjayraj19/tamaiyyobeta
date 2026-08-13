# Tamaiyyo

Production-oriented foundation for **Tamaiyyo**, a scalable outstation cab booking marketplace for India. This repository currently contains **web-first** scaffolding only—no booking, payments, or fleet logic yet.

## Stack

- [Next.js](https://nextjs.org/) (App Router)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Better Auth](https://www.better-auth.com/) — HTTP surface at `/api/auth/*`, stateless foundation (see `docs/features/frontend-auth-architecture.md`)

## Getting started

```bash
# Use Node 20+ (see package.json engines)
npm install
cp .env.example .env.local
npm run db:bootstrap:local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Set `BETTER_AUTH_SECRET` (≥32 chars) in `.env.local` for anything beyond local placeholders; role dashboards (`/customer`, `/supplier`, `/admin`) require a session cookie and redirect to `/login` when missing (unless `AUTH_MIDDLEWARE_ENABLED=false`).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint with fixes |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check |
| `npm run typecheck` | TypeScript noEmit |

## Repository layout

- `src/app` — Routes, layouts, and route groups for **customer**, **supplier**, and **admin** (`/api/auth/*` for Better Auth)
- `src/components/ui` — shadcn-style primitives
- `src/components/shared` — Cross-role UI building blocks
- `src/lib/auth` — Better Auth server/client wiring and session helpers
- `src/features` — Domain modules (e.g. `features/auth` session bridge)
- `src/config` — Site metadata and typed environment accessors
- `docs` — Architecture and frontend guidelines

## Documentation

- [docs/architecture.md](./docs/architecture.md) — Structural decisions and routing model
- [docs/frontend-guidelines.md](./docs/frontend-guidelines.md) — Day-to-day frontend conventions
- [docs/environment.md](./docs/environment.md) — Environment variables
- [docs/project/local-dev-setup.md](./docs/project/local-dev-setup.md) — PostgreSQL + seed-data local bootstrap
- [docs/features/frontend-auth-architecture.md](./docs/features/frontend-auth-architecture.md) — Better Auth + App Router integration

## shadcn/ui

After installing dependencies, add components with:

```bash
npx shadcn@latest add <component>
```

`components.json` is preconfigured for the New York style, neutral base, CSS variables, and the `@/` import alias.

## License

Private / unlicensed until the team assigns a license.
