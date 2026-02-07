import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Check if user exists at all
  const users: any[] = await prisma.$queryRawUnsafe(`
    SELECT "id", "email", "passwordHash", "role", "isPlatformAdmin", "companyId"
    FROM "User"
    WHERE "email" = 'scootergupta@gmail.com'
  `);

  if (users.length === 0) {
    console.log('NO USER FOUND with email scootergupta@gmail.com');

    // List all users
    const allUsers: any[] = await prisma.$queryRawUnsafe(`
      SELECT "id", "email", "role", "isPlatformAdmin" FROM "User" LIMIT 10
    `);
    console.log('All users in DB:', allUsers);
    return;
  }

  const user = users[0];
  console.log('User found:');
  console.log('  ID:', user.id);
  console.log('  Email:', user.email);
  console.log('  Role:', user.role);
  console.log('  isPlatformAdmin:', user.isPlatformAdmin);
  console.log('  companyId:', user.companyId);
  console.log('  passwordHash:', user.passwordHash?.substring(0, 20) + '...');

  // Test password
  const match = await bcrypt.compare('password123', user.passwordHash);
  console.log('  Password "password123" matches:', match);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
