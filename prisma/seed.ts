import {
  PrismaClient,
  AgeBucket,
  DriverStatus,
  FuelType,
  SupplierAccountStatus,
  VehicleCategory,
  VehicleStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Tamaiyyo database seed script.
 *
 * Run: npx prisma db seed
 *
 * Seed scope:
 * - Mock identity/accounts for customer, supplier, admin
 * - Mock supplier fleet (vehicles + drivers)
 * - One-way corridor pricing rows for quote testing
 *
 * Idempotent by design: re-running the seed updates existing records.
 */

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding Tamaiyyo database...");

  const customerIdentity = await prisma.identity.upsert({
    where: { phone: "+919900000001" },
    update: {
      email: "customer.dev@tamaiyyo.local",
      verifiedAt: new Date(),
    },
    create: {
      id: "seed-identity-customer-1",
      phone: "+919900000001",
      email: "customer.dev@tamaiyyo.local",
      verifiedAt: new Date(),
    },
  });

  const supplierIdentity = await prisma.identity.upsert({
    where: { phone: "+919900000002" },
    update: {
      email: "supplier.dev@tamaiyyo.local",
      verifiedAt: new Date(),
    },
    create: {
      id: "seed-identity-supplier-1",
      phone: "+919900000002",
      email: "supplier.dev@tamaiyyo.local",
      verifiedAt: new Date(),
    },
  });

  const adminIdentity = await prisma.identity.upsert({
    where: { phone: "+919900000003" },
    update: {
      email: "admin.dev@tamaiyyo.local",
      verifiedAt: new Date(),
    },
    create: {
      id: "seed-identity-admin-1",
      phone: "+919900000003",
      email: "admin.dev@tamaiyyo.local",
      verifiedAt: new Date(),
    },
  });

  const customer = await prisma.customerAccount.upsert({
    where: { identityId: customerIdentity.id },
    update: {
      id: "mock-customer-1",
      name: "Dev Customer",
      status: "ACTIVE",
    },
    create: {
      id: "mock-customer-1",
      identityId: customerIdentity.id,
      name: "Dev Customer",
      status: "ACTIVE",
    },
  });

  const supplier = await prisma.supplierAccount.upsert({
    where: { identityId: supplierIdentity.id },
    update: {
      id: "mock-supplier-1",
      businessName: "Dev Supplier Fleet",
      status: SupplierAccountStatus.ACTIVE,
      verificationApprovedAt: new Date(),
      verificationApprovedBy: "mock-admin-1",
    },
    create: {
      id: "mock-supplier-1",
      identityId: supplierIdentity.id,
      businessName: "Dev Supplier Fleet",
      status: SupplierAccountStatus.ACTIVE,
      verificationApprovedAt: new Date(),
      verificationApprovedBy: "mock-admin-1",
      payoutBankDetails: {
        accountNumber: "000111222333",
        ifsc: "HDFC0001234",
        accountHolderName: "Dev Supplier Fleet",
      },
    },
  });

  const admin = await prisma.adminAccount.upsert({
    where: { identityId: adminIdentity.id },
    update: {
      id: "mock-admin-1",
      role: "ADMIN_ALL",
    },
    create: {
      id: "mock-admin-1",
      identityId: adminIdentity.id,
      role: "ADMIN_ALL",
    },
  });

  await prisma.vehicle.upsert({
    where: { registrationNumber: "MH12AB1234" },
    update: {
      supplierId: supplier.id,
      category: VehicleCategory.SEDAN,
      ageYears: 2,
      ageBucket: AgeBucket.ZERO_TO_THREE,
      fuelType: FuelType.PETROL,
      status: VehicleStatus.ACTIVE,
      deletedAt: null,
    },
    create: {
      id: "seed-vehicle-sedan-1",
      supplierId: supplier.id,
      registrationNumber: "MH12AB1234",
      category: VehicleCategory.SEDAN,
      ageYears: 2,
      ageBucket: AgeBucket.ZERO_TO_THREE,
      fuelType: FuelType.PETROL,
      status: VehicleStatus.ACTIVE,
    },
  });

  await prisma.vehicle.upsert({
    where: { registrationNumber: "MH12CD5678" },
    update: {
      supplierId: supplier.id,
      category: VehicleCategory.INNOVA_CRYSTA,
      ageYears: 4,
      ageBucket: AgeBucket.THREE_TO_SEVEN,
      fuelType: FuelType.DIESEL,
      status: VehicleStatus.ACTIVE,
      deletedAt: null,
    },
    create: {
      id: "seed-vehicle-innova-1",
      supplierId: supplier.id,
      registrationNumber: "MH12CD5678",
      category: VehicleCategory.INNOVA_CRYSTA,
      ageYears: 4,
      ageBucket: AgeBucket.THREE_TO_SEVEN,
      fuelType: FuelType.DIESEL,
      status: VehicleStatus.ACTIVE,
    },
  });

  const existingDriver1 = await prisma.driver.findFirst({
    where: { supplierId: supplier.id, phone: "+919900001111" },
  });

  if (existingDriver1) {
    await prisma.driver.update({
      where: { id: existingDriver1.id },
      data: {
        name: "Dev Driver One",
        licenseNumber: "DL-DEV-001",
        status: DriverStatus.ACTIVE,
        deletedAt: null,
      },
    });
  } else {
    await prisma.driver.create({
      data: {
        id: "seed-driver-1",
        supplierId: supplier.id,
        name: "Dev Driver One",
        phone: "+919900001111",
        licenseNumber: "DL-DEV-001",
        status: DriverStatus.ACTIVE,
      },
    });
  }

  const existingDriver2 = await prisma.driver.findFirst({
    where: { supplierId: supplier.id, phone: "+919900001112" },
  });

  if (existingDriver2) {
    await prisma.driver.update({
      where: { id: existingDriver2.id },
      data: {
        name: "Dev Driver Two",
        licenseNumber: "DL-DEV-002",
        status: DriverStatus.ACTIVE,
        deletedAt: null,
      },
    });
  } else {
    await prisma.driver.create({
      data: {
        id: "seed-driver-2",
        supplierId: supplier.id,
        name: "Dev Driver Two",
        phone: "+919900001112",
        licenseNumber: "DL-DEV-002",
        status: DriverStatus.ACTIVE,
      },
    });
  }

  await prisma.oneWayCorridor.upsert({
    where: {
      sourceCity_destinationCity_vehicleCategory: {
        sourceCity: "Pune",
        destinationCity: "Mumbai",
        vehicleCategory: VehicleCategory.SEDAN,
      },
    },
    update: {
      fareAmount: "7500.00",
      routeDistanceKm: 150,
      returnDistanceKm: 150,
      isActive: true,
    },
    create: {
      id: "seed-corridor-pune-mumbai-sedan",
      sourceCity: "Pune",
      destinationCity: "Mumbai",
      vehicleCategory: VehicleCategory.SEDAN,
      fareAmount: "7500.00",
      routeDistanceKm: 150,
      returnDistanceKm: 150,
      isActive: true,
    },
  });

  await prisma.oneWayCorridor.upsert({
    where: {
      sourceCity_destinationCity_vehicleCategory: {
        sourceCity: "Pune",
        destinationCity: "Nashik",
        vehicleCategory: VehicleCategory.ERTIGA,
      },
    },
    update: {
      fareAmount: "8200.00",
      routeDistanceKm: 210,
      returnDistanceKm: 210,
      isActive: true,
    },
    create: {
      id: "seed-corridor-pune-nashik-ertiga",
      sourceCity: "Pune",
      destinationCity: "Nashik",
      vehicleCategory: VehicleCategory.ERTIGA,
      fareAmount: "8200.00",
      routeDistanceKm: 210,
      returnDistanceKm: 210,
      isActive: true,
    },
  });

  await prisma.oneWayCorridor.upsert({
    where: {
      sourceCity_destinationCity_vehicleCategory: {
        sourceCity: "Bangalore",
        destinationCity: "Mysore",
        vehicleCategory: VehicleCategory.INNOVA_CRYSTA,
      },
    },
    update: {
      fareAmount: "9800.00",
      routeDistanceKm: 145,
      returnDistanceKm: 145,
      isActive: true,
    },
    create: {
      id: "seed-corridor-bangalore-mysore-innova",
      sourceCity: "Bangalore",
      destinationCity: "Mysore",
      vehicleCategory: VehicleCategory.INNOVA_CRYSTA,
      fareAmount: "9800.00",
      routeDistanceKm: 145,
      returnDistanceKm: 145,
      isActive: true,
    },
  });

  console.log("✅ Seed complete with operational test data");
  console.log(`   customerId: ${customer.id}`);
  console.log(`   supplierId: ${supplier.id}`);
  console.log(`   adminId: ${admin.id}`);
  console.log("   one-way corridors: 3");
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
