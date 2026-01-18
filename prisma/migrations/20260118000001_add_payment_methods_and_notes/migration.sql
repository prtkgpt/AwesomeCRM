-- Add payment usernames and internal notes to Client table
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "zelleId" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "venmoUsername" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "cashAppUsername" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "cleaningTeamNotes" TEXT;
