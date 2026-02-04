import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'scootergupta@gmail.com';
  const password = 'password123';
  const passwordHash = await bcrypt.hash(password, 12);

  // Ensure isPlatformAdmin column exists
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false
  `);

  // Ensure winBackEnabled and other required Company columns exist
  await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "winBackEnabled" BOOLEAN NOT NULL DEFAULT false`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "winBackConfig" JSONB`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "referralEnabled" BOOLEAN NOT NULL DEFAULT false`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "referralReferrerReward" DOUBLE PRECISION DEFAULT 25`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "referralRefereeReward" DOUBLE PRECISION DEFAULT 25`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "onlineBookingEnabled" BOOLEAN NOT NULL DEFAULT true`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "minimumLeadTimeHours" INTEGER NOT NULL DEFAULT 2`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "maxDaysAhead" INTEGER NOT NULL DEFAULT 60`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "requireApproval" BOOLEAN NOT NULL DEFAULT false`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "yelpReviewUrl" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "insuranceCost" DOUBLE PRECISION DEFAULT 0`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "bondCost" DOUBLE PRECISION DEFAULT 0`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "workersCompCost" DOUBLE PRECISION DEFAULT 0`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "cleaningSuppliesCost" DOUBLE PRECISION DEFAULT 0`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "gasReimbursementRate" DOUBLE PRECISION DEFAULT 0`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "vaAdminSalary" DOUBLE PRECISION DEFAULT 0`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "ownerSalary" DOUBLE PRECISION DEFAULT 0`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "otherExpenses" DOUBLE PRECISION DEFAULT 0`);

  // Use raw SQL to upsert the platform company (bypasses Prisma schema validation)
  const companyResult: any[] = await prisma.$queryRawUnsafe(`
    INSERT INTO "Company" ("id", "name", "slug", "email", "plan", "subscriptionStatus", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, 'CleanDay Platform', 'cleanday-platform', 'admin@cleandaycrm.com', 'PRO', 'ACTIVE', NOW(), NOW())
    ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED."name"
    RETURNING "id", "name"
  `);

  const companyId = companyResult[0].id;
  const companyName = companyResult[0].name;

  // Use raw SQL to upsert the platform admin user
  const userResult: any[] = await prisma.$queryRawUnsafe(`
    INSERT INTO "User" ("id", "email", "passwordHash", "name", "companyId", "role", "isPlatformAdmin", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, $1, $2, 'Scooter Gupta', $3, 'OWNER', true, NOW(), NOW())
    ON CONFLICT ("email") DO UPDATE SET "isPlatformAdmin" = true, "passwordHash" = $2
    RETURNING "id"
  `, email, passwordHash, companyId);

  const userId = userResult[0].id;

  console.log('Platform admin created successfully:');
  console.log(`  Email: ${email}`);
  console.log(`  User ID: ${userId}`);
  console.log(`  Company: ${companyName} (${companyId})`);
  console.log(`  isPlatformAdmin: true`);
}

main()
  .catch((e) => {
    console.error('Failed to seed platform admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
