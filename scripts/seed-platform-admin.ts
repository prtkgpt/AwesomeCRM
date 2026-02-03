import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'scootergupta@gmail.com';
  const password = 'password123';
  const passwordHash = await bcrypt.hash(password, 12);

  // Platform admins need a companyId — upsert a dedicated platform company
  const platformCompany = await prisma.company.upsert({
    where: { slug: 'cleanday-platform' },
    update: {},
    create: {
      name: 'CleanDay Platform',
      slug: 'cleanday-platform',
      email: 'admin@cleandaycrm.com',
      plan: 'PRO',
      subscriptionStatus: 'ACTIVE',
    },
  });

  // Upsert the platform admin user
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      isPlatformAdmin: true,
      passwordHash,
    },
    create: {
      email,
      passwordHash,
      name: 'Scooter Gupta',
      companyId: platformCompany.id,
      role: 'OWNER',
      isPlatformAdmin: true,
    },
  });

  console.log('Platform admin created successfully:');
  console.log(`  Email: ${email}`);
  console.log(`  User ID: ${user.id}`);
  console.log(`  Company: ${platformCompany.name} (${platformCompany.id})`);
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
