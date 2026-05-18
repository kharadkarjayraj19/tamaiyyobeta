import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Tamaiyyo database seed script.
 *
 * Run: npx prisma db seed
 *
 * Architecture:
 * - Seed admin accounts for initial platform access
 * - Seed pricing config versions (placeholder until pricing-config module)
 * - Seed city/corridor data (placeholder until city-config module)
 *
 * MVP scope: Minimal seed for operational testing only
 */

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding Tamaiyyo database...");

  // ============================================================================
  // ADMIN SEED (placeholder)
  // ============================================================================

  console.log("📋 Admin accounts: placeholder");
  // TODO: When admin authentication is wired, seed initial admin identity + account
  // Example:
  // const adminIdentity = await prisma.identity.upsert({
  //   where: { phone: "+919876543210" },
  //   update: {},
  //   create: {
  //     phone: "+919876543210",
  //     email: "admin@tamaiyyo.internal",
  //     verifiedAt: new Date(),
  //   },
  // });
  //
  // await prisma.adminAccount.upsert({
  //   where: { identityId: adminIdentity.id },
  //   update: {},
  //   create: {
  //     identityId: adminIdentity.id,
  //     role: "ADMIN_ALL",
  //   },
  // });

  // ============================================================================
  // PRICING CONFIG SEED (placeholder)
  // ============================================================================

  console.log("💰 Pricing config: placeholder");
  // TODO: When PricingConfigVersion model is added, seed initial rate cards
  // Per docs/features/pricing-engine.md:
  // - City-wise rate cards (Pune, Bangalore, etc.)
  // - Category rates (Sedan, Ertiga, Kia Carens, Innova Crysta)
  // - Age bucket modifiers (0-3, 3-7, 7-12 years)
  // - Extension SKUs (8hr/80km, 1day/300km)
  // - 300 km/day baseline configuration

  // ============================================================================
  // CITY/CORRIDOR SEED (placeholder)
  // ============================================================================

  console.log("🗺️  City/corridor data: placeholder");
  // TODO: When city/corridor config module is added, seed operational cities
  // - Source cities (pickup origin markets)
  // - Popular corridors (e.g. Pune → Mumbai, Bangalore → Chennai)
  // - One-way eligibility flags per corridor

  console.log("✅ Seed complete (placeholders only — no operational data)");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
