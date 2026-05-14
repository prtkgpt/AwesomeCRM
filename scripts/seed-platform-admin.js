const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables');
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('Password must be at least 12 characters');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Ensure isPlatformAdmin column exists
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false
  `);

  // Upsert the platform company
  const companyResult = await prisma.$queryRawUnsafe(`
    INSERT INTO "Company" ("id", "name", "slug", "email", "plan", "subscriptionStatus", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, 'CleanDay Platform', 'cleanday-platform', 'admin@cleandaycrm.com', 'PRO', 'ACTIVE', NOW(), NOW())
    ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED."name"
    RETURNING "id", "name"
  `);

  const companyId = companyResult[0].id;
  const companyName = companyResult[0].name;

  // Upsert the platform admin user
  const userResult = await prisma.$queryRawUnsafe(`
    INSERT INTO "User" ("id", "email", "passwordHash", "name", "companyId", "role", "isPlatformAdmin", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, $1, $2, 'Platform Admin', $3, 'OWNER', true, NOW(), NOW())
    ON CONFLICT ("email") DO UPDATE SET "isPlatformAdmin" = true, "passwordHash" = $2, "role" = 'OWNER', "companyId" = $3
    RETURNING "id"
  `, email, passwordHash, companyId);

  const userId = userResult[0].id;

  console.log('Platform admin created successfully:');
  console.log(`  Email: ${email}`);
  console.log(`  Role: OWNER`);
  console.log(`  isPlatformAdmin: true`);
  console.log(`  User ID: ${userId}`);
  console.log(`  Company: ${companyName} (${companyId})`);
}

main()
  .catch((e) => { console.error('Failed to seed platform admin:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
