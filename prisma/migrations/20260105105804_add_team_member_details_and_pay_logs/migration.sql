-- AlterTable TeamMember - Add new columns for address and work details
ALTER TABLE "TeamMember" ADD COLUMN "street" TEXT;
ALTER TABLE "TeamMember" ADD COLUMN "city" TEXT;
ALTER TABLE "TeamMember" ADD COLUMN "state" TEXT;
ALTER TABLE "TeamMember" ADD COLUMN "zip" TEXT;
ALTER TABLE "TeamMember" ADD COLUMN "experience" TEXT;
ALTER TABLE "TeamMember" ADD COLUMN "speed" TEXT;
ALTER TABLE "TeamMember" ADD COLUMN "serviceAreas" TEXT[];

-- CreateEnum
CREATE TYPE "PayLogType" AS ENUM ('PAYCHECK', 'SUPPLIES_REIMBURSEMENT', 'GAS_REIMBURSEMENT');

-- CreateTable
CREATE TABLE "PayLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "type" "PayLogType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "hoursWorked" DOUBLE PRECISION,
    "hourlyRate" DOUBLE PRECISION,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "receiptUrl" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayLog_companyId_idx" ON "PayLog"("companyId");
CREATE INDEX "PayLog_teamMemberId_idx" ON "PayLog"("teamMemberId");
CREATE INDEX "PayLog_type_idx" ON "PayLog"("type");
CREATE INDEX "PayLog_date_idx" ON "PayLog"("date");

-- AddForeignKey
ALTER TABLE "PayLog" ADD CONSTRAINT "PayLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayLog" ADD CONSTRAINT "PayLog_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
