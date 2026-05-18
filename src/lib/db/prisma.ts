import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { serverEnv } from "@/config/env/server";

/**
 * Prisma singleton client for Next.js — prevents multiple instances in development.
 *
 * Architecture:
 * - PostgreSQL as source of truth (docs/architecture/prisma-data-architecture.md)
 * - Prisma as thin persistence layer (schema.prisma)
 * - Repositories own Prisma queries; services own business logic
 *
 * Usage:
 * - Import `prisma` in repository modules only
 * - Services orchestrate transactions via `prisma.$transaction`
 * - Never import this file from Client Components
 *
 * Prisma 7.x: Uses PostgreSQL adapter with connection pool
 */

const prismaClientSingleton = () => {
  // Create PostgreSQL connection pool (only if DATABASE_URL is provided)
  const pool = serverEnv.databaseUrl
    ? new Pool({ connectionString: serverEnv.databaseUrl })
    : undefined;

  const adapter = pool ? new PrismaPg(pool) : undefined;

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
