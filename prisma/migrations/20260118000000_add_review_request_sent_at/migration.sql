-- Add reviewRequestSentAt column to Booking table
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "reviewRequestSentAt" TIMESTAMP(3);
