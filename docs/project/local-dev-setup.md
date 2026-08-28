# Tamayo — local development environment setup

**Purpose:** practical setup guide for running Tamayo locally with PostgreSQL and seeded test data.

For production-readiness sequencing (auth hardening, secrets, migration safety, rollout gates), see `docs/project/dev-to-prod-shift-plan.md`.

---

## What you need

- **Node.js 20+** (see `package.json` engines)
- **npm**
- **A PostgreSQL server** (choose one):
  - local machine install (Postgres app/Homebrew), or
  - Docker using `docker-compose.dev.yml`

Optional for feature testing:

- **Google Maps API key** (`GOOGLE_MAPS_API_KEY`) for server-side route distance estimation
- **PostHog keys** for analytics verification (`NEXT_PUBLIC_POSTHOG_KEY`, `POSTHOG_PROJECT_API_KEY`)

---

## Option A: start PostgreSQL with Docker (recommended)

From repo root:

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts:

- host: `localhost`
- port: `5432`
- db: `tamayo_dev`
- user: `tamayo`
- password: `tamayo`

---

## Environment variables

Copy and edit env file:

```bash
cp .env.example .env.local
```

Required local DB env values:

- `DATABASE_URL=postgresql://tamayo:tamayo@localhost:5432/tamayo_dev`
- `SHADOW_DATABASE_URL=postgresql://tamayo:tamayo@localhost:5432/tamayo_shadow`

Optional local auth shortcut:

- `DEV_AUTH_BYPASS=true` to bypass protected-role login checks in local development only.
- When enabled:
  - `/customer/*` resolves as `mock-customer-1`
  - `/supplier/*` resolves as `mock-supplier-1`
  - `/admin/*` resolves as `mock-admin-1`

Create the shadow DB once:

```sql
CREATE DATABASE tamayo_shadow;
```

---

## Bootstrap local database + test data

From repo root:

```bash
npm install
npm run db:bootstrap:local
```

This command does:

1. Prisma client generation
2. Apply committed migrations
3. Seed operational test data

---

## Seeded test data included

The seed script now creates/updates:

- `mock-customer-1` (customer account)
- `mock-supplier-1` (active supplier)
- `mock-admin-1` (admin account)
- Active vehicles and drivers for supplier testing
- One-way corridor rows:
  - Pune -> Mumbai (SEDAN)
  - Pune -> Nashik (ERTIGA)
  - Bangalore -> Mysore (INNOVA_CRYSTA)

These records are idempotent and safe to re-seed.

---

## Run the app

```bash
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

Useful local pages:

- Customer quote workbench: `/customer/booking-quote`
- Admin corridor manager: `/admin/one-way-corridors`

---

## Troubleshooting

- If migrations fail with schema-history mismatch, verify:
  - `DATABASE_URL` points to the intended local DB
  - `SHADOW_DATABASE_URL` exists and is reachable
- If route distance does not auto-resolve, ensure `GOOGLE_MAPS_API_KEY` is set; flow falls back to provided estimated km.
