-- AlterTable
ALTER TABLE "Company" ADD COLUMN "stripeSecretKey" TEXT;
ALTER TABLE "Company" ADD COLUMN "stripePublishableKey" TEXT;
ALTER TABLE "Company" ADD COLUMN "stripeWebhookSecret" TEXT;
