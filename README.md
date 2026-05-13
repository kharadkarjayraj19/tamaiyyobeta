# Tamaiyyo

Production-oriented foundation for **Tamaiyyo**, a scalable outstation cab booking marketplace for India. This repository currently contains **web-first** scaffolding only—no booking, payments, or fleet logic yet.

## Stack

- [Next.js](https://nextjs.org/) (App Router)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)–compatible structure (`components.json`, `components/ui`, design tokens in `src/app/globals.css`)

## Getting started

```bash
# Use Node 20+ (see package.json engines)
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Role placeholders live at `/customer`, `/supplier`, and `/admin`.

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

- `src/app` — Routes, layouts, and route groups for **customer**, **supplier**, and **admin**
- `src/components/ui` — shadcn-style primitives
- `src/components/shared` — Cross-role UI building blocks
- `src/features` — Domain modules (empty placeholders for now)
- `src/config` — Site metadata and typed environment accessors
- `docs` — Architecture and frontend guidelines

## Documentation

- [docs/architecture.md](./docs/architecture.md) — Structural decisions and routing model
- [docs/frontend-guidelines.md](./docs/frontend-guidelines.md) — Day-to-day frontend conventions
- [docs/environment.md](./docs/environment.md) — Environment variables

## shadcn/ui

After installing dependencies, add components with:

```bash
npx shadcn@latest add <component>
```

`components.json` is preconfigured for the New York style, neutral base, CSS variables, and the `@/` import alias.

## License

Private / unlicensed until the team assigns a license.
