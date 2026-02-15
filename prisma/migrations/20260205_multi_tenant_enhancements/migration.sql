-- Multi-Tenant Architecture Enhancement Migration
-- Analytics, Email, Cleaner, Customer, and PWA enhancements

-- ============================================
-- ANALYTICS
-- ============================================

CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageBookingValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenueByService" JSONB,
    "unpaidRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "completedBookings" INTEGER NOT NULL DEFAULT 0,
    "cancelledBookings" INTEGER NOT NULL DEFAULT 0,
    "noShowBookings" INTEGER NOT NULL DEFAULT 0,
    "scheduledBookings" INTEGER NOT NULL DEFAULT 0,
    "newCustomers" INTEGER NOT NULL DEFAULT 0,
    "returningCustomers" INTEGER NOT NULL DEFAULT 0,
    "totalActiveCustomers" INTEGER NOT NULL DEFAULT 0,
    "churned" INTEGER NOT NULL DEFAULT 0,
    "activeCleaners" INTEGER NOT NULL DEFAULT 0,
    "averageJobsPerCleaner" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHoursWorked" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referralSignups" INTEGER NOT NULL DEFAULT 0,
    "referralConversions" INTEGER NOT NULL DEFAULT 0,
    "referralCreditsAwarded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referralCreditsUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "totalTips" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnalyticsSnapshot_companyId_date_type_key" ON "AnalyticsSnapshot"("companyId", "date", "type");
CREATE INDEX "AnalyticsSnapshot_companyId_date_idx" ON "AnalyticsSnapshot"("companyId", "date");
CREATE INDEX "AnalyticsSnapshot_companyId_type_idx" ON "AnalyticsSnapshot"("companyId", "type");

ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- EMAIL MANAGEMENT
-- ============================================

CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "variables" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailTemplate_companyId_category_idx" ON "EmailTemplate"("companyId", "category");
CREATE INDEX "EmailTemplate_companyId_isActive_idx" ON "EmailTemplate"("companyId", "isActive");

ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "templateId" TEXT,
    "campaignId" TEXT,
    "recipientId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "recipientType" TEXT,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "providerId" TEXT,
    "providerStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailLog_companyId_status_idx" ON "EmailLog"("companyId", "status");
CREATE INDEX "EmailLog_companyId_createdAt_idx" ON "EmailLog"("companyId", "createdAt");
CREATE INDEX "EmailLog_campaignId_idx" ON "EmailLog"("campaignId");
CREATE INDEX "EmailLog_recipientEmail_idx" ON "EmailLog"("recipientEmail");
CREATE INDEX "EmailLog_templateId_idx" ON "EmailLog"("templateId");

ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- CLEANER ENHANCEMENTS
-- ============================================

CREATE TABLE "JobPhoto" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobPhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobPhoto_bookingId_idx" ON "JobPhoto"("bookingId");
CREATE INDEX "JobPhoto_bookingId_type_idx" ON "JobPhoto"("bookingId", "type");

ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CleanerLocation" (
    "id" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "bookingId" TEXT,
    "action" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleanerLocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CleanerLocation_teamMemberId_recordedAt_idx" ON "CleanerLocation"("teamMemberId", "recordedAt");
CREATE INDEX "CleanerLocation_bookingId_idx" ON "CleanerLocation"("bookingId");

ALTER TABLE "CleanerLocation" ADD CONSTRAINT "CleanerLocation_teamMemberId_fkey"
    FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CleanerAvailability" (
    "id" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleanerAvailability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CleanerAvailability_teamMemberId_dayOfWeek_key" ON "CleanerAvailability"("teamMemberId", "dayOfWeek");
CREATE INDEX "CleanerAvailability_teamMemberId_idx" ON "CleanerAvailability"("teamMemberId");

ALTER TABLE "CleanerAvailability" ADD CONSTRAINT "CleanerAvailability_teamMemberId_fkey"
    FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CleanerTimeOff" (
    "id" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleanerTimeOff_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CleanerTimeOff_teamMemberId_idx" ON "CleanerTimeOff"("teamMemberId");
CREATE INDEX "CleanerTimeOff_teamMemberId_startDate_endDate_idx" ON "CleanerTimeOff"("teamMemberId", "startDate", "endDate");

ALTER TABLE "CleanerTimeOff" ADD CONSTRAINT "CleanerTimeOff_teamMemberId_fkey"
    FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- PWA & PUSH NOTIFICATIONS
-- ============================================

CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "deviceType" TEXT,
    "deviceName" TEXT,
    "userAgent" TEXT,
    "platform" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_userId_endpoint_key" ON "PushSubscription"("userId", "endpoint");
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");
CREATE INDEX "PushSubscription_userId_isActive_idx" ON "PushSubscription"("userId", "isActive");

ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushJobAssignments" BOOLEAN NOT NULL DEFAULT true,
    "pushJobReminders" BOOLEAN NOT NULL DEFAULT true,
    "pushPaymentReceived" BOOLEAN NOT NULL DEFAULT true,
    "pushReviewReceived" BOOLEAN NOT NULL DEFAULT true,
    "pushChatMessages" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailJobAssignments" BOOLEAN NOT NULL DEFAULT true,
    "emailJobReminders" BOOLEAN NOT NULL DEFAULT true,
    "emailDailyDigest" BOOLEAN NOT NULL DEFAULT false,
    "emailWeeklyReport" BOOLEAN NOT NULL DEFAULT true,
    "emailMarketingOptIn" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsJobReminders" BOOLEAN NOT NULL DEFAULT true,
    "smsUrgentOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
