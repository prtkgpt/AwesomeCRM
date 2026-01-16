-- AlterEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'CLEANER', 'CUSTOMER');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "logo" TEXT,
    "primaryColor" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hourlyRate" DOUBLE PRECISION,
    "employeeId" TEXT,
    "hireDate" TIMESTAMP(3),
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "photo" TEXT,
    "specialties" TEXT[],
    "availability" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- Create a default company for existing data
INSERT INTO "Company" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES ('demo-company-id', 'Demo Company', 'demo-company', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable User - Add new columns
ALTER TABLE "User" ADD COLUMN "companyId" TEXT;
ALTER TABLE "User" ADD COLUMN "role" "UserRole";
ALTER TABLE "User" ADD COLUMN "customerUserId" TEXT;

-- Update existing users to belong to demo company with OWNER role
UPDATE "User" SET "companyId" = 'demo-company-id', "role" = 'OWNER' WHERE "companyId" IS NULL;

-- Make companyId and role required
ALTER TABLE "User" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';

-- AlterTable Client - Add companyId
ALTER TABLE "Client" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Client" ADD COLUMN "customerUserId" TEXT;

-- Update existing clients to belong to demo company
UPDATE "Client" SET "companyId" = 'demo-company-id' WHERE "companyId" IS NULL;

-- Make companyId required
ALTER TABLE "Client" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable Booking - Add new columns
ALTER TABLE "Booking" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "assignedTo" TEXT;
ALTER TABLE "Booking" ADD COLUMN "customerId" TEXT;

-- Update existing bookings to belong to demo company
UPDATE "Booking" SET "companyId" = 'demo-company-id' WHERE "companyId" IS NULL;

-- Make companyId required
ALTER TABLE "Booking" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable Message - Add companyId
ALTER TABLE "Message" ADD COLUMN "companyId" TEXT;

-- Update existing messages to belong to demo company
UPDATE "Message" SET "companyId" = 'demo-company-id' WHERE "companyId" IS NULL;

-- Make companyId required
ALTER TABLE "Message" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable MessageTemplate - Add companyId and update unique constraint
ALTER TABLE "MessageTemplate" ADD COLUMN "companyId" TEXT;

-- Update existing templates to belong to demo company
UPDATE "MessageTemplate" SET "companyId" = 'demo-company-id' WHERE "companyId" IS NULL;

-- Make companyId required
ALTER TABLE "MessageTemplate" ALTER COLUMN "companyId" SET NOT NULL;

-- Drop old unique constraint and create new one
ALTER TABLE "MessageTemplate" DROP CONSTRAINT IF EXISTS "MessageTemplate_userId_type_key";

-- AlterTable Invoice - Add companyId
ALTER TABLE "Invoice" ADD COLUMN "companyId" TEXT;

-- Update existing invoices to belong to demo company
UPDATE "Invoice" SET "companyId" = 'demo-company-id' WHERE "companyId" IS NULL;

-- Make companyId required
ALTER TABLE "Invoice" ALTER COLUMN "companyId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
CREATE INDEX "Company_slug_idx" ON "Company"("slug");

CREATE UNIQUE INDEX "TeamMember_userId_key" ON "TeamMember"("userId");
CREATE INDEX "TeamMember_companyId_idx" ON "TeamMember"("companyId");
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");
CREATE INDEX "Invitation_companyId_email_idx" ON "Invitation"("companyId", "email");

CREATE INDEX "User_companyId_role_idx" ON "User"("companyId", "role");
CREATE UNIQUE INDEX "Client_customerUserId_key" ON "Client"("customerUserId");
CREATE INDEX "Client_companyId_idx" ON "Client"("companyId");

CREATE INDEX "Booking_companyId_idx" ON "Booking"("companyId");
CREATE INDEX "Booking_assignedTo_idx" ON "Booking"("assignedTo");
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");

CREATE INDEX "Message_companyId_idx" ON "Message"("companyId");
CREATE INDEX "MessageTemplate_companyId_idx" ON "MessageTemplate"("companyId");
CREATE UNIQUE INDEX "MessageTemplate_companyId_type_key" ON "MessageTemplate"("companyId", "type");

CREATE INDEX "Invoice_companyId_idx" ON "Invoice"("companyId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Client" ADD CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Message" ADD CONSTRAINT "Message_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
