-- AlterTable Company: Add reminder settings
ALTER TABLE "Company" ADD COLUMN "enableCustomerReminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "enableCleanerReminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "customerReminderHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN "cleanerReminderHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN "enableMorningOfReminder" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "morningOfReminderTime" TEXT NOT NULL DEFAULT '08:00';

-- AlterTable Booking: Add specific reminder tracking
ALTER TABLE "Booking" ADD COLUMN "customerReminderSentAt" TIMESTAMP(3),
ADD COLUMN "cleanerReminderSentAt" TIMESTAMP(3),
ADD COLUMN "morningOfReminderSentAt" TIMESTAMP(3);
