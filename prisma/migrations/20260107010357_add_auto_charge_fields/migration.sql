-- AlterTable
ALTER TABLE "Client" ADD COLUMN "stripePaymentMethodId" TEXT;
ALTER TABLE "Client" ADD COLUMN "autoChargeEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "paymentPreAuthAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "paymentPreAuthAmount" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN "autoChargeAttemptedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "autoChargeSuccessful" BOOLEAN NOT NULL DEFAULT false;
