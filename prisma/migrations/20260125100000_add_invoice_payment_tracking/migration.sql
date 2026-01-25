-- Add payment tracking fields to Invoice table
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paidVia" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;

-- Add INVOICE_PAID to AuditAction enum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INVOICE_PAID';
