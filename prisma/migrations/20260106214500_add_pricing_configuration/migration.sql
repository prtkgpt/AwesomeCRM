-- AlterTable
ALTER TABLE "Company" ADD COLUMN "hourlyRate" DOUBLE PRECISION DEFAULT 50.00;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "serviceTypeMultipliers" JSONB;
