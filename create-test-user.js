const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    console.error('Set TEST_EMAIL and TEST_PASSWORD environment variables');
    console.error('Example: TEST_EMAIL=test@test.com TEST_PASSWORD=yourpassword node create-test-user.js');
    process.exit(1);
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.log(`User ${email} already exists!`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: 'Test User',
        businessName: 'Test Cleaning',
      },
    });

    console.log('Test user created successfully!');
    console.log(`Email: ${email}`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
