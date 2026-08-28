#!/usr/bin/env bash
set -euo pipefail

echo "🔧 Bootstrapping local database for Tamayo..."

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL is not set. Please export it or add it to .env/.env.local."
  exit 1
fi

if [[ -z "${SHADOW_DATABASE_URL:-}" ]]; then
  echo "⚠️  SHADOW_DATABASE_URL is not set. Prisma migrate dev may require it in some setups."
fi

echo "📦 Generating Prisma client..."
npm run db:generate

echo "🗃️  Applying committed migrations..."
npm run db:migrate:deploy

echo "🌱 Seeding test data..."
npm run db:seed

echo "✅ Local DB bootstrap complete."
