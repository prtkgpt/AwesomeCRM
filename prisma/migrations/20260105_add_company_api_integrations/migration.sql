-- AlterTable
ALTER TABLE "Company" ADD COLUMN "emailDomain" TEXT,
ADD COLUMN "twilioAccountSid" TEXT,
ADD COLUMN "twilioAuthToken" TEXT,
ADD COLUMN "twilioPhoneNumber" TEXT,
ADD COLUMN "resendApiKey" TEXT;
