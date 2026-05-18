# Tamaiyyo — Database setup guide

**Purpose:** Guide for setting up PostgreSQL database and running Prisma migrations for Tamaiyyo.

**Prerequisites:**

- PostgreSQL 14+ installed and running
- Node.js 20.9.0+ installed
- Repository cloned and dependencies installed (`npm install`)

---

## Local development setup

### 1. Create local PostgreSQL database

```bash
# Using psql
createdb tamaiyyo_dev

# Or via PostgreSQL client
psql -U postgres
CREATE DATABASE tamaiyyo_dev;
\q
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and set `DATABASE_URL`:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/tamaiyyo_dev
```

**Connection string format:**

```
postgresql://[user]:[password]@[host]:[port]/[database]
```

### 3. Run migrations

Apply the initial migration to create all tables:

```bash
npm run db:migrate:dev
```

This will:

- Create all enums (13 enums for lifecycle states)
- Create all tables (21 models)
- Create indexes for operational queries
- Apply foreign key constraints

### 4. (Optional) Run seed script

Seed placeholder data (currently no operational data):

```bash
npm run db:seed
```

The seed script includes placeholders for:

- Admin accounts (when auth is wired)
- Pricing configuration (when pricing module is added)
- City/corridor data (when city config is added)

### 5. Verify setup

Open Prisma Studio to inspect the database:

```bash
npm run db:studio
```

This opens a web UI at `http://localhost:5555` for exploring tables.

---

## Production deployment

### 1. Provision managed PostgreSQL

Use a managed PostgreSQL service:

- **Supabase** (recommended for MVP per `backend-architecture.md`)
- **AWS RDS for PostgreSQL**
- **Google Cloud SQL**
- **Azure Database for PostgreSQL**

### 2. Configure production DATABASE_URL

Set `DATABASE_URL` environment variable in your deployment platform (Vercel, Railway, etc.):

```env
DATABASE_URL=postgresql://user:password@host:5432/tamaiyyo_production
```

**Security notes:**

- Use strong passwords
- Enable SSL/TLS connections (`?sslmode=require`)
- Restrict network access to deployment platform IPs only
- Use read-only replicas for analytics (exploratory)

### 3. Run migrations

In your deployment pipeline:

```bash
npm run db:migrate:deploy
```

This applies all pending migrations **without** creating new ones.

**CI/CD notes:**

- Run migrations before deploying application code
- Use separate `DATABASE_URL` for staging vs production
- Test migrations in staging environment first
- Have rollback plan for failed migrations

---

## Migration workflow

### Creating new migrations

When you modify `prisma/schema.prisma`:

```bash
npm run db:migrate:dev --name description_of_change
```

This:

1. Generates migration SQL in `prisma/migrations/[timestamp]_[name]/`
2. Applies migration to your local database
3. Regenerates Prisma Client

### Resetting local database

To start fresh (destroys all data):

```bash
npx prisma migrate reset
```

This:

1. Drops database
2. Recreates database
3. Applies all migrations
4. Runs seed script

---

## Troubleshooting

### Connection refused

- Verify PostgreSQL is running: `pg_isready`
- Check `DATABASE_URL` host and port
- Verify PostgreSQL allows TCP connections (check `postgresql.conf`)

### Migration conflicts

If migrations are out of sync:

1. **Development:** Reset with `npx prisma migrate reset`
2. **Production:** Use `npx prisma migrate resolve` carefully

### Schema drift

If schema and migrations diverge:

```bash
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script
```

---

## Database maintenance

### Backups

**Local development:**

```bash
pg_dump tamaiyyo_dev > backup_$(date +%Y%m%d).sql
```

**Production:** Use managed service automated backups (daily recommended).

### Performance monitoring

- Monitor slow queries via PostgreSQL logs
- Use `EXPLAIN ANALYZE` for query optimization
- Review indexes when adding new query patterns

### Scaling considerations (exploratory)

- Read replicas for analytics queries
- Connection pooling (PgBouncer) for high concurrency
- Partitioning for large tables (bookings, events)

---

## Security best practices

1. **Never commit `.env`** — use `.env.example` as template
2. **Rotate database passwords** periodically
3. **Use least-privilege database users** for application vs admin
4. **Enable audit logging** in PostgreSQL for compliance
5. **Encrypt at rest** — use managed service encryption

---

## Related documentation

- [`docs/architecture/prisma-schema-planning.md`](../architecture/prisma-schema-planning.md) — Schema design blueprint
- [`docs/architecture/prisma-data-architecture.md`](../architecture/prisma-data-architecture.md) — Persistence philosophy
- [`docs/architecture/backend-architecture.md`](../architecture/backend-architecture.md) — Stack and deployment

---

## Quick reference

| Command | Purpose |
| --- | --- |
| `npm run db:generate` | Regenerate Prisma Client after schema changes |
| `npm run db:migrate:dev` | Create and apply new migration (development) |
| `npm run db:migrate:deploy` | Apply pending migrations (production) |
| `npm run db:seed` | Run seed script |
| `npm run db:studio` | Open Prisma Studio UI |
| `npx prisma migrate reset` | Reset database and reapply all migrations |
| `npx prisma db push` | Sync schema without creating migration (prototyping only) |

---

**Last updated:** 2026-05-18  
**Status:** Foundation complete; operational deployment pending PostgreSQL provisioning.
