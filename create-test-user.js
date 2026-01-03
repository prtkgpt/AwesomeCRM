const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: 'test@test.com' },
    });

    if (existing) {
      console.log('✅ User test@test.com already exists!');
      console.log('You can login with:');
      console.log('Email: test@test.com');
      console.log('Password: password123');
      return;
    }

    // Create new user
    const passwordHash = await bcrypt.hash('password123', 10);

    const user = await prisma.user.create({
      data: {
        email: 'test@test.com',
        passwordHash,
        name: 'Test User',
        businessName: 'Test Cleaning',
      },
    });

    console.log('✅ Test user created successfully!');
    console.log('Email: test@test.com');
    console.log('Password: password123');
    console.log('');
    console.log('You can now login at http://localhost:3000/login');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
