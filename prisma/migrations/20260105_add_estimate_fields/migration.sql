-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "estimateToken" TEXT,
ADD COLUMN "estimateAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "estimateAcceptedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_estimateToken_key" ON "Booking"("estimateToken");

-- CreateIndex
CREATE INDEX "Booking_estimateToken_idx" ON "Booking"("estimateToken");
