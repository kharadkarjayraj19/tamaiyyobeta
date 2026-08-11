-- AlterEnum
ALTER TYPE "ProductType" ADD VALUE 'MULTI_CITY';

-- AlterTable
ALTER TABLE "BookingItinerary" DROP COLUMN "estimatedDistance",
ADD COLUMN     "returnDistanceKm" INTEGER,
ADD COLUMN     "routeDistanceKm" INTEGER;

-- AlterTable
ALTER TABLE "BookingPricingSnapshot" ADD COLUMN     "billableKm" INTEGER NOT NULL,
ADD COLUMN     "minimumKmPerDay" INTEGER NOT NULL,
ADD COLUMN     "operationalBundleAmount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "perKmRate" DECIMAL(10,2) NOT NULL;

-- CreateTable
CREATE TABLE "OneWayCorridor" (
    "id" TEXT NOT NULL,
    "sourceCity" TEXT NOT NULL,
    "destinationCity" TEXT NOT NULL,
    "vehicleCategory" "VehicleCategory" NOT NULL,
    "fareAmount" DECIMAL(10,2) NOT NULL,
    "routeDistanceKm" INTEGER,
    "returnDistanceKm" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OneWayCorridor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OneWayCorridor_sourceCity_destinationCity_idx" ON "OneWayCorridor"("sourceCity", "destinationCity");

-- CreateIndex
CREATE INDEX "OneWayCorridor_isActive_idx" ON "OneWayCorridor"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "OneWayCorridor_sourceCity_destinationCity_vehicleCategory_key" ON "OneWayCorridor"("sourceCity", "destinationCity", "vehicleCategory");
