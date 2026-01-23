-- Marketing Campaigns Migration
-- Adds Campaign and CampaignRecipient tables for bulk messaging
-- Adds marketing opt-out fields to Client table

-- =============================================
-- 1. Add marketing opt-out fields to Client
-- =============================================
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "marketingOptOut" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "marketingOptOutAt" TIMESTAMP(3);
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "lastMarketingEmail" TIMESTAMP(3);
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "lastMarketingSMS" TIMESTAMP(3);

-- =============================================
-- 2. Create Campaign Type Enum
-- =============================================
DO $$ BEGIN
    CREATE TYPE "CampaignType" AS ENUM ('BULK_SMS', 'BULK_EMAIL', 'BOTH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- 3. Create Campaign Status Enum
-- =============================================
DO $$ BEGIN
    CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'COMPLETED', 'PAUSED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- 4. Create Segment Type Enum
-- =============================================
DO $$ BEGIN
    CREATE TYPE "SegmentType" AS ENUM ('ALL', 'TAGS', 'BOOKING_FREQUENCY', 'INACTIVE', 'LOCATION', 'INSURANCE', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- 5. Create Campaign Recipient Status Enum
-- =============================================
DO $$ BEGIN
    CREATE TYPE "CampaignRecipientStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'OPENED', 'CLICKED', 'OPTED_OUT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- 6. Add new AuditAction values
-- =============================================
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CAMPAIGN_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CAMPAIGN_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CAMPAIGN_SENT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CAMPAIGN_SCHEDULED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CAMPAIGN_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CAMPAIGN_DELETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MARKETING_OPT_OUT';

-- =============================================
-- 7. Create Campaign Table
-- =============================================
CREATE TABLE IF NOT EXISTS "Campaign" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CampaignType" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "segmentType" "SegmentType" NOT NULL DEFAULT 'ALL',
    "segmentData" JSONB,
    "subject" TEXT,
    "messageBody" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "openedCount" INTEGER NOT NULL DEFAULT 0,
    "clickedCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- 8. Create CampaignRecipient Table
-- =============================================
CREATE TABLE IF NOT EXISTS "CampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "channel" "CampaignType" NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" "CampaignRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "twilioSid" TEXT,
    "resendId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- 9. Add Foreign Key Constraints
-- =============================================
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================
-- 10. Create Indexes for Performance
-- =============================================
-- Campaign indexes
CREATE INDEX IF NOT EXISTS "Campaign_companyId_idx" ON "Campaign"("companyId");
CREATE INDEX IF NOT EXISTS "Campaign_companyId_status_idx" ON "Campaign"("companyId", "status");
CREATE INDEX IF NOT EXISTS "Campaign_companyId_scheduledAt_idx" ON "Campaign"("companyId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "Campaign_companyId_createdAt_idx" ON "Campaign"("companyId", "createdAt");

-- CampaignRecipient indexes
CREATE INDEX IF NOT EXISTS "CampaignRecipient_campaignId_idx" ON "CampaignRecipient"("campaignId");
CREATE INDEX IF NOT EXISTS "CampaignRecipient_companyId_idx" ON "CampaignRecipient"("companyId");
CREATE INDEX IF NOT EXISTS "CampaignRecipient_clientId_idx" ON "CampaignRecipient"("clientId");
CREATE INDEX IF NOT EXISTS "CampaignRecipient_status_idx" ON "CampaignRecipient"("status");

-- Unique constraint for one recipient per channel per campaign
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignRecipient_campaignId_clientId_channel_key"
    ON "CampaignRecipient"("campaignId", "clientId", "channel");

-- Client marketing indexes
CREATE INDEX IF NOT EXISTS "Client_companyId_marketingOptOut_idx" ON "Client"("companyId", "marketingOptOut");
