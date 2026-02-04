-- =============================================
-- Comprehensive idempotent migration to sync schema with DB
-- All statements use IF NOT EXISTS or exception handling
-- to safely skip objects that already exist. NO DATA IS DELETED.
-- =============================================

-- =============================================
-- 1. CREATE NEW ENUMS (skip if already exist)
-- =============================================

DO $$ BEGIN CREATE TYPE "ReferralTier" AS ENUM ('NONE', 'BRONZE', 'SILVER', 'GOLD'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReferralCreditType" AS ENUM ('EARNED', 'USED', 'EXPIRED', 'TIER_BONUS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReferralCreditStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CampaignChannel" AS ENUM ('SMS', 'EMAIL', 'BOTH'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "WinBackResult" AS ENUM ('SENT', 'DELIVERED', 'CONVERTED', 'EXPIRED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PricingRuleType" AS ENUM ('BEDROOM', 'BATHROOM', 'ADDON', 'CUSTOM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PricingDisplay" AS ENUM ('BOTH', 'BOOKING', 'ESTIMATE', 'HIDDEN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BackupStatus" AS ENUM ('ACTIVE', 'RESTORING', 'ARCHIVED', 'DELETED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- 2. ADD VALUES TO EXISTING ENUMS (skip if exist)
-- =============================================

DO $$ BEGIN ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'CLEANER_COMPLETED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'BIRTHDAY_GREETING'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'ANNIVERSARY_GREETING'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'REVIEW_REQUEST'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'MARKETING_SMS'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'MARKETING_EMAIL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- 3. ALTER TABLE: Company (18 new columns)
-- =============================================

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "yelpReviewUrl" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "insuranceCost" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "bondCost" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "workersCompCost" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "cleaningSuppliesCost" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "gasReimbursementRate" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "vaAdminSalary" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "ownerSalary" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "otherExpenses" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "winBackEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "winBackConfig" JSONB;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "referralEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "referralReferrerReward" DOUBLE PRECISION DEFAULT 25;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "referralRefereeReward" DOUBLE PRECISION DEFAULT 25;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "onlineBookingEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "minimumLeadTimeHours" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "maxDaysAhead" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "requireApproval" BOOLEAN NOT NULL DEFAULT false;

-- =============================================
-- 4. ALTER TABLE: Client (15 new columns)
-- =============================================

ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "referredById" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "referralCreditsEarned" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "referralCreditsUsed" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "referralCreditsBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "referralTier" "ReferralTier" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "referralTierBonusEarned" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "birthday" TIMESTAMP(3);
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "anniversary" TIMESTAMP(3);
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "anniversaryType" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "enableBirthdayGreetings" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "enableAnniversaryGreetings" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "marketingOptOut" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "lastBirthdayGreetingSent" TIMESTAMP(3);
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "lastAnniversaryGreetingSent" TIMESTAMP(3);

-- Client indexes and constraints (skip if exist)
CREATE UNIQUE INDEX IF NOT EXISTS "Client_referralCode_key" ON "Client"("referralCode");
CREATE INDEX IF NOT EXISTS "Client_referralCode_idx" ON "Client"("referralCode");
CREATE INDEX IF NOT EXISTS "Client_referredById_idx" ON "Client"("referredById");

DO $$ BEGIN ALTER TABLE "Client" ADD CONSTRAINT "Client_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- 5. ALTER TABLE: Booking (7 new columns)
-- =============================================

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "referralCreditsApplied" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "finalPrice" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "reviewRequestSentAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "completedBy" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;

DO $$ BEGIN ALTER TABLE "Booking" ADD CONSTRAINT "Booking_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Booking" ADD CONSTRAINT "Booking_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- 6. CREATE TABLE: ReferralCreditTransaction
-- =============================================

CREATE TABLE IF NOT EXISTS "ReferralCreditTransaction" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "ReferralCreditType" NOT NULL,
    "description" TEXT,
    "expiresAt" TIMESTAMP(3),
    "status" "ReferralCreditStatus" NOT NULL DEFAULT 'ACTIVE',
    "relatedReferralId" TEXT,
    "relatedBookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralCreditTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReferralCreditTransaction_clientId_idx" ON "ReferralCreditTransaction"("clientId");
CREATE INDEX IF NOT EXISTS "ReferralCreditTransaction_companyId_idx" ON "ReferralCreditTransaction"("companyId");
CREATE INDEX IF NOT EXISTS "ReferralCreditTransaction_status_idx" ON "ReferralCreditTransaction"("status");
CREATE INDEX IF NOT EXISTS "ReferralCreditTransaction_expiresAt_idx" ON "ReferralCreditTransaction"("expiresAt");
CREATE INDEX IF NOT EXISTS "ReferralCreditTransaction_createdAt_idx" ON "ReferralCreditTransaction"("createdAt");

DO $$ BEGIN ALTER TABLE "ReferralCreditTransaction" ADD CONSTRAINT "ReferralCreditTransaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- 7. CREATE TABLE: ClientPreference
-- =============================================

CREATE TABLE IF NOT EXISTS "ClientPreference" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "cleaningSequence" TEXT,
    "areasToFocus" TEXT,
    "areasToAvoid" TEXT,
    "productAllergies" TEXT,
    "preferredProducts" TEXT,
    "avoidScents" BOOLEAN NOT NULL DEFAULT false,
    "scentPreferences" TEXT,
    "petHandlingInstructions" TEXT,
    "petFeedingNeeded" BOOLEAN NOT NULL DEFAULT false,
    "petFeedingInstructions" TEXT,
    "preferredContactMethod" TEXT,
    "notificationPreferences" TEXT,
    "languagePreference" TEXT,
    "keyLocation" TEXT,
    "alarmCode" TEXT,
    "entryInstructions" TEXT,
    "specialRequests" TEXT,
    "thingsToKnow" TEXT,
    "temperaturePreferences" TEXT,
    "lastVisitNotes" TEXT,
    "lastVisitDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClientPreference_clientId_key" ON "ClientPreference"("clientId");
CREATE INDEX IF NOT EXISTS "ClientPreference_clientId_idx" ON "ClientPreference"("clientId");

DO $$ BEGIN ALTER TABLE "ClientPreference" ADD CONSTRAINT "ClientPreference_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- 8. CREATE TABLE: Campaign
-- =============================================

CREATE TABLE IF NOT EXISTS "Campaign" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "CampaignChannel" NOT NULL DEFAULT 'SMS',
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "segmentFilter" JSONB,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Campaign_companyId_idx" ON "Campaign"("companyId");
CREATE INDEX IF NOT EXISTS "Campaign_userId_idx" ON "Campaign"("userId");
CREATE INDEX IF NOT EXISTS "Campaign_status_idx" ON "Campaign"("status");

DO $$ BEGIN ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- 9. CREATE TABLE: CampaignRecipient
-- =============================================

CREATE TABLE IF NOT EXISTS "CampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "channel" "CampaignChannel" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CampaignRecipient_campaignId_clientId_key" ON "CampaignRecipient"("campaignId", "clientId");
CREATE INDEX IF NOT EXISTS "CampaignRecipient_campaignId_idx" ON "CampaignRecipient"("campaignId");
CREATE INDEX IF NOT EXISTS "CampaignRecipient_clientId_idx" ON "CampaignRecipient"("clientId");

DO $$ BEGIN ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- 10. CREATE TABLE: WinBackAttempt
-- =============================================

CREATE TABLE IF NOT EXISTS "WinBackAttempt" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "result" "WinBackResult" NOT NULL DEFAULT 'SENT',
    "convertedBookingId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "convertedRevenue" DOUBLE PRECISION,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WinBackAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WinBackAttempt_companyId_idx" ON "WinBackAttempt"("companyId");
CREATE INDEX IF NOT EXISTS "WinBackAttempt_clientId_idx" ON "WinBackAttempt"("clientId");
CREATE INDEX IF NOT EXISTS "WinBackAttempt_companyId_result_idx" ON "WinBackAttempt"("companyId", "result");
CREATE INDEX IF NOT EXISTS "WinBackAttempt_companyId_clientId_step_idx" ON "WinBackAttempt"("companyId", "clientId", "step");

DO $$ BEGIN ALTER TABLE "WinBackAttempt" ADD CONSTRAINT "WinBackAttempt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "WinBackAttempt" ADD CONSTRAINT "WinBackAttempt_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- 11. CREATE TABLE: DiscountCode
-- =============================================

CREATE TABLE IF NOT EXISTS "DiscountCode" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DiscountCode_companyId_code_key" ON "DiscountCode"("companyId", "code");
CREATE INDEX IF NOT EXISTS "DiscountCode_companyId_idx" ON "DiscountCode"("companyId");
CREATE INDEX IF NOT EXISTS "DiscountCode_code_idx" ON "DiscountCode"("code");
CREATE INDEX IF NOT EXISTS "DiscountCode_companyId_isActive_idx" ON "DiscountCode"("companyId", "isActive");

DO $$ BEGIN ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- 12. CREATE TABLE: PricingRule
-- =============================================

CREATE TABLE IF NOT EXISTS "PricingRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "PricingRuleType" NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "display" "PricingDisplay" NOT NULL DEFAULT 'BOTH',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "quantity" DOUBLE PRECISION,
    "serviceType" TEXT,
    "frequency" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PricingRule_companyId_type_idx" ON "PricingRule"("companyId", "type");
CREATE INDEX IF NOT EXISTS "PricingRule_companyId_isActive_idx" ON "PricingRule"("companyId", "isActive");

DO $$ BEGIN ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- 13. CREATE TABLE: JobChecklist
-- =============================================

CREATE TABLE IF NOT EXISTS "JobChecklist" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "checklistData" JSONB NOT NULL,
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobChecklist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "JobChecklist_bookingId_key" ON "JobChecklist"("bookingId");
CREATE INDEX IF NOT EXISTS "JobChecklist_bookingId_idx" ON "JobChecklist"("bookingId");

DO $$ BEGIN ALTER TABLE "JobChecklist" ADD CONSTRAINT "JobChecklist_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- 14. CREATE TABLE: CompanyBackup
-- =============================================

CREATE TABLE IF NOT EXISTS "CompanyBackup" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "data" JSONB NOT NULL,
    "clientsCount" INTEGER NOT NULL DEFAULT 0,
    "bookingsCount" INTEGER NOT NULL DEFAULT 0,
    "invoicesCount" INTEGER NOT NULL DEFAULT 0,
    "teamMembersCount" INTEGER NOT NULL DEFAULT 0,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "BackupStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "CompanyBackup_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CompanyBackup_companyId_idx" ON "CompanyBackup"("companyId");
CREATE INDEX IF NOT EXISTS "CompanyBackup_companyId_status_idx" ON "CompanyBackup"("companyId", "status");
CREATE INDEX IF NOT EXISTS "CompanyBackup_createdAt_idx" ON "CompanyBackup"("createdAt");

DO $$ BEGIN ALTER TABLE "CompanyBackup" ADD CONSTRAINT "CompanyBackup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "CompanyBackup" ADD CONSTRAINT "CompanyBackup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- 15. CREATE TABLE: BlogPost
-- =============================================

CREATE TABLE IF NOT EXISTS "BlogPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "coverImage" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "authorId" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BlogPost_slug_key" ON "BlogPost"("slug");
CREATE INDEX IF NOT EXISTS "BlogPost_slug_idx" ON "BlogPost"("slug");
CREATE INDEX IF NOT EXISTS "BlogPost_published_publishedAt_idx" ON "BlogPost"("published", "publishedAt");
CREATE INDEX IF NOT EXISTS "BlogPost_authorId_idx" ON "BlogPost"("authorId");

DO $$ BEGIN ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
