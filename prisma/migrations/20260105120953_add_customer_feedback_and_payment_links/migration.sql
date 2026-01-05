-- AlterTable Company - Add Google review link and payment info
ALTER TABLE "Company" ADD COLUMN "googleReviewUrl" TEXT;
ALTER TABLE "Company" ADD COLUMN "zelleEmail" TEXT;
ALTER TABLE "Company" ADD COLUMN "venmoUsername" TEXT;
ALTER TABLE "Company" ADD COLUMN "cashappUsername" TEXT;

-- AlterTable Booking - Add customer feedback and tip tracking
ALTER TABLE "Booking" ADD COLUMN "feedbackToken" TEXT;
ALTER TABLE "Booking" ADD COLUMN "customerRating" INTEGER;
ALTER TABLE "Booking" ADD COLUMN "customerFeedback" TEXT;
ALTER TABLE "Booking" ADD COLUMN "tipAmount" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN "tipPaidVia" TEXT;
ALTER TABLE "Booking" ADD COLUMN "feedbackSubmittedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_feedbackToken_key" ON "Booking"("feedbackToken");
CREATE INDEX "Booking_feedbackToken_idx" ON "Booking"("feedbackToken");
