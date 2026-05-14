-- AlterTable: Add trial fields to Company
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "trialExpiredNotified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "couponCodeUsed" TEXT;

-- Set trialEndsAt for existing companies (30 days from createdAt)
UPDATE "Company" SET "trialEndsAt" = "createdAt" + INTERVAL '30 days' WHERE "trialEndsAt" IS NULL AND "plan" = 'FREE';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Company_plan_idx" ON "Company"("plan");
CREATE INDEX IF NOT EXISTS "Company_trialEndsAt_idx" ON "Company"("trialEndsAt");

-- CreateTable: Announcement
CREATE TABLE IF NOT EXISTS "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "targetPlans" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dismissible" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Announcement_isActive_expiresAt_idx" ON "Announcement"("isActive", "expiresAt");
ALTER TABLE "Announcement" DROP CONSTRAINT IF EXISTS "Announcement_createdById_fkey";
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: PlatformPlan
CREATE TABLE IF NOT EXISTS "PlatformPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxClients" INTEGER,
    "maxUsers" INTEGER,
    "maxBookingsPerMonth" INTEGER,
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformPlan_name_key" ON "PlatformPlan"("name");

-- Seed default plans
INSERT INTO "PlatformPlan" ("id", "name", "displayName", "price", "maxClients", "maxUsers", "maxBookingsPerMonth", "features", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
    ('plan_free', 'FREE', 'Free Trial', 0, 5, 2, 20, '{"teamManagement": false, "insuranceBilling": false, "recurringBilling": true, "marketing": false}', true, 0, NOW(), NOW()),
    ('plan_basic', 'BASIC', 'Basic', 20, 50, 5, 200, '{"teamManagement": true, "insuranceBilling": false, "recurringBilling": true, "marketing": true}', true, 1, NOW(), NOW()),
    ('plan_pro', 'PRO', 'Pro', 50, NULL, NULL, NULL, '{"teamManagement": true, "insuranceBilling": true, "recurringBilling": true, "marketing": true}', true, 2, NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

-- CreateTable: CouponCode
CREATE TABLE IF NOT EXISTS "CouponCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL DEFAULT 'percent',
    "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trialDays" INTEGER,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CouponCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CouponCode_code_key" ON "CouponCode"("code");
CREATE INDEX IF NOT EXISTS "CouponCode_code_idx" ON "CouponCode"("code");
CREATE INDEX IF NOT EXISTS "CouponCode_isActive_idx" ON "CouponCode"("isActive");
