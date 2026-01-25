-- Add reminder tracking fields to Invoice table (IF NOT EXISTS for idempotency)
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "lastReminderAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "reminderCount" INTEGER NOT NULL DEFAULT 0;

-- Create InvoiceReminder table for tracking payment reminders
CREATE TABLE IF NOT EXISTS "InvoiceReminder" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentTo" TEXT NOT NULL,
    "sentBy" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "emailOpened" BOOLEAN NOT NULL DEFAULT false,
    "emailOpenedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceReminder_pkey" PRIMARY KEY ("id")
);

-- Create index on invoiceId for faster lookups (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "InvoiceReminder_invoiceId_idx" ON "InvoiceReminder"("invoiceId");

-- Add foreign key constraint (wrapped in DO block to handle if exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'InvoiceReminder_invoiceId_fkey'
    ) THEN
        ALTER TABLE "InvoiceReminder" ADD CONSTRAINT "InvoiceReminder_invoiceId_fkey"
        FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
