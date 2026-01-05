-- AlterTable Booking - Add copay payment tracking fields
ALTER TABLE "Booking" ADD COLUMN "copayPaymentMethod" TEXT;
ALTER TABLE "Booking" ADD COLUMN "copayStripePaymentIntentId" TEXT;

-- Create unique index on copayStripePaymentIntentId
CREATE UNIQUE INDEX "Booking_copayStripePaymentIntentId_key" ON "Booking"("copayStripePaymentIntentId");
