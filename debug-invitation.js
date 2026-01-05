const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const token = 'a280eeccfa31d3fd869b236e3ce10635b8938c5f9402463f564549a3b027f397';

async function debugInvitation() {
  try {
    console.log('🔍 Looking for invitation with token:', token);
    console.log('');

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!invitation) {
      console.log('❌ Invitation NOT FOUND with this token');
      console.log('');

      // Check all invitations
      const allInvitations = await prisma.invitation.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          company: {
            select: { name: true },
          },
        },
      });

      console.log('📋 Recent invitations in database:');
      allInvitations.forEach((inv, i) => {
        console.log(`${i + 1}. Email: ${inv.email}`);
        console.log(`   Token: ${inv.token.substring(0, 20)}...`);
        console.log(`   Status: ${inv.status}`);
        console.log(`   Company: ${inv.company.name}`);
        console.log(`   Expires: ${inv.expiresAt}`);
        console.log('');
      });
    } else {
      console.log('✅ Invitation FOUND!');
      console.log('');
      console.log('Details:');
      console.log('  Email:', invitation.email);
      console.log('  Status:', invitation.status);
      console.log('  Role:', invitation.role);
      console.log('  Company:', invitation.company.name);
      console.log('  Company ID:', invitation.company.id);
      console.log('  Company Slug:', invitation.company.slug);
      console.log('  Created:', invitation.createdAt);
      console.log('  Expires:', invitation.expiresAt);
      console.log('');

      const now = new Date();
      const expired = now > new Date(invitation.expiresAt);
      console.log('  Is Expired?', expired);

      if (expired) {
        console.log('  ⏰ This invitation has EXPIRED');
      }

      if (invitation.status !== 'PENDING') {
        console.log('  🚫 This invitation is NOT PENDING');
      }

      if (!expired && invitation.status === 'PENDING') {
        console.log('  ✨ This invitation is VALID and should work!');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugInvitation();
