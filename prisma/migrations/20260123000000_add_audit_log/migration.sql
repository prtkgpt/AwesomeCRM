-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "AuditAction" AS ENUM (
        'LOGIN',
        'LOGOUT',
        'LOGIN_FAILED',
        'PASSWORD_CHANGED',
        'CLIENT_CREATED',
        'CLIENT_UPDATED',
        'CLIENT_DELETED',
        'BOOKING_CREATED',
        'BOOKING_UPDATED',
        'BOOKING_CANCELLED',
        'BOOKING_COMPLETED',
        'BOOKING_APPROVED',
        'TEAM_MEMBER_ADDED',
        'TEAM_MEMBER_UPDATED',
        'TEAM_MEMBER_REMOVED',
        'PAYMENT_RECEIVED',
        'PAYMENT_FAILED',
        'INVOICE_CREATED',
        'INVOICE_SENT',
        'MESSAGE_SENT',
        'EMAIL_SENT',
        'SETTINGS_UPDATED',
        'COMPANY_UPDATED',
        'ESTIMATE_CREATED',
        'ESTIMATE_SENT',
        'ESTIMATE_ACCEPTED',
        'REVIEW_RECEIVED',
        'TIME_OFF_REQUESTED',
        'TIME_OFF_APPROVED',
        'TIME_OFF_DENIED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "description" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_companyId_idx" ON "AuditLog"("companyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_companyId_createdAt_idx" ON "AuditLog"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_companyId_action_idx" ON "AuditLog"("companyId", "action");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
