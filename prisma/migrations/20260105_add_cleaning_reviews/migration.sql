-- CreateTable
CREATE TABLE "CleaningReview" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "houseConditionRating" INTEGER,
    "customerRating" INTEGER,
    "tipRating" INTEGER,
    "overallRating" INTEGER NOT NULL,
    "notes" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CleaningReview_bookingId_idx" ON "CleaningReview"("bookingId");

-- CreateIndex
CREATE INDEX "CleaningReview_reviewerId_idx" ON "CleaningReview"("reviewerId");

-- CreateIndex
CREATE INDEX "CleaningReview_companyId_idx" ON "CleaningReview"("companyId");

-- AddForeignKey
ALTER TABLE "CleaningReview" ADD CONSTRAINT "CleaningReview_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningReview" ADD CONSTRAINT "CleaningReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningReview" ADD CONSTRAINT "CleaningReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
