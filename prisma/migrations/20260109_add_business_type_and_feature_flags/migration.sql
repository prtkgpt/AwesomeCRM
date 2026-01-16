-- AlterTable: Add business configuration fields to Company
ALTER TABLE "Company" ADD COLUMN "businessType" TEXT[] DEFAULT ARRAY['RESIDENTIAL']::TEXT[];
ALTER TABLE "Company" ADD COLUMN "enabledFeatures" JSONB;

-- Set default enabled features for all existing companies
-- Most companies get basic features only
UPDATE "Company" SET "enabledFeatures" = '{"insuranceBilling": false, "recurringBilling": true, "teamManagement": true}'::jsonb
WHERE "enabledFeatures" IS NULL;

-- Enable insurance billing for Awesome Maids specifically (by slug)
UPDATE "Company" SET "enabledFeatures" = '{"insuranceBilling": true, "recurringBilling": true, "teamManagement": true}'::jsonb
WHERE "slug" = 'awesome-maids';

-- Also handle if Awesome Maids has different slug variations
UPDATE "Company" SET "enabledFeatures" = '{"insuranceBilling": true, "recurringBilling": true, "teamManagement": true}'::jsonb
WHERE "slug" LIKE '%awesome%maids%' OR "slug" LIKE '%awesomemaids%';
