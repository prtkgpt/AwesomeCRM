-- AlterTable Client: Add insurance and Helper Bee's fields
ALTER TABLE "Client" ADD COLUMN "helperBeesReferralId" TEXT,
ADD COLUMN "insuranceProvider" TEXT,
ADD COLUMN "hasInsurance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "insurancePaymentAmount" DOUBLE PRECISION,
ADD COLUMN "standardCopayAmount" DOUBLE PRECISION,
ADD COLUMN "hasDiscountedCopay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "copayDiscountAmount" DOUBLE PRECISION,
ADD COLUMN "copayNotes" TEXT;

-- CreateIndex
CREATE INDEX "Client_helperBeesReferralId_idx" ON "Client"("helperBeesReferralId");

-- AlterTable Address: Add Google Maps verification and property details
ALTER TABLE "Address" ADD COLUMN "googlePlaceId" TEXT,
ADD COLUMN "lat" DOUBLE PRECISION,
ADD COLUMN "lng" DOUBLE PRECISION,
ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "formattedAddress" TEXT,
ADD COLUMN "propertyType" TEXT,
ADD COLUMN "squareFootage" INTEGER,
ADD COLUMN "bedrooms" INTEGER,
ADD COLUMN "bathrooms" DOUBLE PRECISION,
ADD COLUMN "floors" INTEGER,
ADD COLUMN "yearBuilt" INTEGER;

-- CreateIndex
CREATE INDEX "Address_googlePlaceId_idx" ON "Address"("googlePlaceId");

-- AlterTable Booking: Add insurance and copay tracking
ALTER TABLE "Booking" ADD COLUMN "hasInsuranceCoverage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "insuranceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "copayAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "copayDiscountApplied" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "finalCopayAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "insurancePaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "copayPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "insurancePaidAt" TIMESTAMP(3),
ADD COLUMN "copayPaidAt" TIMESTAMP(3);
