-- AlterTable Booking - Add cleaner workflow tracking fields
ALTER TABLE "Booking" ADD COLUMN "onMyWaySentAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "clockedInAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "clockedOutAt" TIMESTAMP(3);
