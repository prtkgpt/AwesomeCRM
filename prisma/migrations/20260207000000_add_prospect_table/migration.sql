-- CreateEnum
CREATE TYPE "ProspectStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'NOT_INTERESTED');

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "website" TEXT,
    "source" TEXT NOT NULL DEFAULT 'SWITCH_PAGE',
    "status" "ProspectStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prospect_status_idx" ON "Prospect"("status");

-- CreateIndex
CREATE INDEX "Prospect_createdAt_idx" ON "Prospect"("createdAt");

-- CreateIndex
CREATE INDEX "Prospect_email_idx" ON "Prospect"("email");
