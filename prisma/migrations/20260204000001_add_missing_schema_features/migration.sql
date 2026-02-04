-- =============================================
-- Comprehensive migration to sync schema with DB
-- Adds: new enums, enum values, columns, tables
-- =============================================

-- =============================================
-- 1. CREATE NEW ENUMS
-- =============================================

CREATE TYPE "ReferralTier" AS ENUM ('NONE', 'BRONZE', 'SILVER', 'GOLD');
CREATE TYPE "ReferralCreditType" AS ENUM ('EARNED', 'USED', 'EXPIRED', 'TIER_BONUS');
CREATE TYPE "ReferralCreditStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED');
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');
CREATE TYPE "CampaignChannel" AS ENUM ('SMS', 'EMAIL', 'BOTH');
CREATE TYPE "WinBackResult" AS ENUM ('SENT', 'DELIVERED', 'CONVERTED', 'EXPIRED', 'FAILED');
CREATE TYPE "PricingRuleType" AS ENUM ('BEDROOM', 'BATHROOM', 'ADDON', 'CUSTOM');
CREATE TYPE "PricingDisplay" AS ENUM ('BOTH', 'BOOKING', 'ESTIMATE', 'HIDDEN');
CREATE TYPE "BackupStatus" AS ENUM ('ACTIVE', 'RESTORING', 'ARCHIVED', 'DELETED');

-- =============================================
-- 2. ADD VALUES TO EXISTING ENUMS
-- =============================================

ALTER TYPE "BookingStatus" ADD VALUE 'CLEANER_COMPLETED';
ALTER TYPE "MessageType" ADD VALUE 'BIRTHDAY_GREETING';
ALTER TYPE "MessageType" ADD VALUE 'ANNIVERSARY_GREETING';
ALTER TYPE "MessageType" ADD VALUE 'REVIEW_REQUEST';
ALTER TYPE "MessageType" ADD VALUE 'MARKETING_SMS';
ALTER TYPE "MessageType" ADD VALUE 'MARKETING_EMAIL';

-- =============================================
-- 3. ALTER TABLE: Company (18 new columns)
-- =============================================

ALTER TABLE "Company" ADD COLUMN "yelpReviewUrl" TEXT;
ALTER TABLE "Company" ADD COLUMN "insuranceCost" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN "bondCost" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN "workersCompCost" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN "cleaningSuppliesCost" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN "gasReimbursementRate" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN "vaAdminSalary" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN "ownerSalary" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN "otherExpenses" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN "winBackEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN "winBackConfig" JSONB;
ALTER TABLE "Company" ADD COLUMN "referralEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN "referralReferrerReward" DOUBLE PRECISION DEFAULT 25;
ALTER TABLE "Company" ADD COLUMN "referralRefereeReward" DOUBLE PRECISION DEFAULT 25;
ALTER TABLE "Company" ADD COLUMN "onlineBookingEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Company" ADD COLUMN "minimumLeadTimeHours" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Company" ADD COLUMN "maxDaysAhead" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "Company" ADD COLUMN "requireApproval" BOOLEAN NOT NULL DEFAULT false;

-- =============================================
-- 4. ALTER TABLE: Client (15 new columns)
-- =============================================

ALTER TABLE "Client" ADD COLUMN "referralCode" TEXT;
ALTER TABLE "Client" ADD COLUMN "referredById" TEXT;
ALTER TABLE "Client" ADD COLUMN "referralCreditsEarned" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Client" ADD COLUMN "referralCreditsUsed" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Client" ADD COLUMN "referralCreditsBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Client" ADD COLUMN "referralTier" "ReferralTier" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Client" ADD COLUMN "referralTierBonusEarned" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Client" ADD COLUMN "birthday" TIMESTAMP(3);
ALTER TABLE "Client" ADD COLUMN "anniversary" TIMESTAMP(3);
ALTER TABLE "Client" ADD COLUMN "anniversaryType" TEXT;
ALTER TABLE "Client" ADD COLUMN "enableBirthdayGreetings" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Client" ADD COLUMN "enableAnniversaryGreetings" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Client" ADD COLUMN "marketingOptOut" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Client" ADD COLUMN "lastBirthdayGreetingSent" TIMESTAMP(3);
ALTER TABLE "Client" ADD COLUMN "lastAnniversaryGreetingSent" TIMESTAMP(3);

-- Client indexes and constraints
CREATE UNIQUE INDEX "Client_referralCode_key" ON "Client"("referralCode");
CREATE INDEX "Client_referralCode_idx" ON "Client"("referralCode");
CREATE INDEX "Client_referredById_idx" ON "Client"("referredById");

-- Client self-referral FK
ALTER TABLE "Client" ADD CONSTRAINT "Client_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================
-- 5. ALTER TABLE: Booking (7 new columns)
-- =============================================

ALTER TABLE "Booking" ADD COLUMN "referralCreditsApplied" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN "finalPrice" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN "reviewRequestSentAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "completedBy" TEXT;
ALTER TABLE "Booking" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "approvedBy" TEXT;

-- Booking FKs for completedBy and approvedBy
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================
-- 6. CREATE TABLE: ReferralCreditTransaction
-- =============================================

CREATE TABLE "ReferralCreditTransaction" (
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

CREATE INDEX "ReferralCreditTransaction_clientId_idx" ON "ReferralCreditTransaction"("clientId");
CREATE INDEX "ReferralCreditTransaction_companyId_idx" ON "ReferralCreditTransaction"("companyId");
CREATE INDEX "ReferralCreditTransaction_status_idx" ON "ReferralCreditTransaction"("status");
CREATE INDEX "ReferralCreditTransaction_expiresAt_idx" ON "ReferralCreditTransaction"("expiresAt");
CREATE INDEX "ReferralCreditTransaction_createdAt_idx" ON "ReferralCreditTransaction"("createdAt");

ALTER TABLE "ReferralCreditTransaction" ADD CONSTRAINT "ReferralCreditTransaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================
-- 7. CREATE TABLE: ClientPreference
-- =============================================

CREATE TABLE "ClientPreference" (
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

CREATE UNIQUE INDEX "ClientPreference_clientId_key" ON "ClientPreference"("clientId");
CREATE INDEX "ClientPreference_clientId_idx" ON "ClientPreference"("clientId");

ALTER TABLE "ClientPreference" ADD CONSTRAINT "ClientPreference_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================
-- 8. CREATE TABLE: Campaign
-- =============================================

CREATE TABLE "Campaign" (
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

CREATE INDEX "Campaign_companyId_idx" ON "Campaign"("companyId");
CREATE INDEX "Campaign_userId_idx" ON "Campaign"("userId");
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================
-- 9. CREATE TABLE: CampaignRecipient
-- =============================================

CREATE TABLE "CampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "channel" "CampaignChannel" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignRecipient_campaignId_clientId_key" ON "CampaignRecipient"("campaignId", "clientId");
CREATE INDEX "CampaignRecipient_campaignId_idx" ON "CampaignRecipient"("campaignId");
CREATE INDEX "CampaignRecipient_clientId_idx" ON "CampaignRecipient"("clientId");

ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================
-- 10. CREATE TABLE: WinBackAttempt
-- =============================================

CREATE TABLE "WinBackAttempt" (
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

CREATE INDEX "WinBackAttempt_companyId_idx" ON "WinBackAttempt"("companyId");
CREATE INDEX "WinBackAttempt_clientId_idx" ON "WinBackAttempt"("clientId");
CREATE INDEX "WinBackAttempt_companyId_result_idx" ON "WinBackAttempt"("companyId", "result");
CREATE INDEX "WinBackAttempt_companyId_clientId_step_idx" ON "WinBackAttempt"("companyId", "clientId", "step");

ALTER TABLE "WinBackAttempt" ADD CONSTRAINT "WinBackAttempt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WinBackAttempt" ADD CONSTRAINT "WinBackAttempt_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================
-- 11. CREATE TABLE: DiscountCode
-- =============================================

CREATE TABLE "DiscountCode" (
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

CREATE UNIQUE INDEX "DiscountCode_companyId_code_key" ON "DiscountCode"("companyId", "code");
CREATE INDEX "DiscountCode_companyId_idx" ON "DiscountCode"("companyId");
CREATE INDEX "DiscountCode_code_idx" ON "DiscountCode"("code");
CREATE INDEX "DiscountCode_companyId_isActive_idx" ON "DiscountCode"("companyId", "isActive");

ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================
-- 12. CREATE TABLE: PricingRule
-- =============================================

CREATE TABLE "PricingRule" (
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

CREATE INDEX "PricingRule_companyId_type_idx" ON "PricingRule"("companyId", "type");
CREATE INDEX "PricingRule_companyId_isActive_idx" ON "PricingRule"("companyId", "isActive");

ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================
-- 13. CREATE TABLE: JobChecklist
-- =============================================

CREATE TABLE "JobChecklist" (
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

CREATE UNIQUE INDEX "JobChecklist_bookingId_key" ON "JobChecklist"("bookingId");
CREATE INDEX "JobChecklist_bookingId_idx" ON "JobChecklist"("bookingId");

ALTER TABLE "JobChecklist" ADD CONSTRAINT "JobChecklist_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================
-- 14. CREATE TABLE: CompanyBackup
-- =============================================

CREATE TABLE "CompanyBackup" (
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

CREATE INDEX "CompanyBackup_companyId_idx" ON "CompanyBackup"("companyId");
CREATE INDEX "CompanyBackup_companyId_status_idx" ON "CompanyBackup"("companyId", "status");
CREATE INDEX "CompanyBackup_createdAt_idx" ON "CompanyBackup"("createdAt");

ALTER TABLE "CompanyBackup" ADD CONSTRAINT "CompanyBackup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyBackup" ADD CONSTRAINT "CompanyBackup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================
-- 15. CREATE TABLE: BlogPost
-- =============================================

CREATE TABLE "BlogPost" (
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

CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");
CREATE INDEX "BlogPost_slug_idx" ON "BlogPost"("slug");
CREATE INDEX "BlogPost_published_publishedAt_idx" ON "BlogPost"("published", "publishedAt");
CREATE INDEX "BlogPost_authorId_idx" ON "BlogPost"("authorId");

ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

