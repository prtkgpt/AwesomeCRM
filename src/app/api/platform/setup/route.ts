import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

// POST /api/platform/setup — first-run platform admin creation
// Only works if no platform admin exists yet
export async function POST(req: NextRequest) {
  try {
    // Check if a platform admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { isPlatformAdmin: true },
      select: { id: true, email: true },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Platform admin already exists. Use the login page.' },
        { status: 409 }
      );
    }

    const body = await req.json();
    const { password, name } = body;
    const email = body.email?.toLowerCase().trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create platform company + admin in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.upsert({
        where: { slug: 'cleanday-platform' },
        update: {},
        create: {
          name: 'CleanDay Platform',
          slug: 'cleanday-platform',
          plan: 'PRO',
          subscriptionStatus: 'ACTIVE',
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: name || 'Platform Admin',
          companyId: company.id,
          role: 'OWNER',
          isPlatformAdmin: true,
        },
      });

      return { user, company };
    });

    return NextResponse.json({
      success: true,
      message: 'Platform admin created successfully',
      userId: result.user.id,
    });
  } catch (error) {
    console.error('Platform setup error:', error);
    return NextResponse.json(
      { error: 'Failed to create platform admin' },
      { status: 500 }
    );
  }
}

// GET /api/platform/setup — check if setup is needed
export async function GET() {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { isPlatformAdmin: true },
      select: { id: true },
    });

    return NextResponse.json({ setupRequired: !existingAdmin });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check setup status' },
      { status: 500 }
    );
  }
}
