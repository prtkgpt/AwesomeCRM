import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

async function verifyPlatformAdmin(session: any) {
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPlatformAdmin: true },
  });
  return user?.isPlatformAdmin === true;
}

// GET /api/platform/team - List all platform team members
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await verifyPlatformAdmin(session))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const members = await prisma.user.findMany({
      where: { isPlatformAdmin: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error('Platform: list team error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch platform team' },
      { status: 500 }
    );
  }
}

// POST /api/platform/team - Add a new platform team member
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await verifyPlatformAdmin(session))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, password } = body;
    const email = body.email?.toLowerCase().trim();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Find or create the platform company
    const platformCompany = await prisma.company.upsert({
      where: { slug: 'cleanday-platform' },
      update: {},
      create: {
        name: 'CleanDay Platform',
        slug: 'cleanday-platform',
        plan: 'PRO',
        subscriptionStatus: 'ACTIVE',
      },
    });

    const newMember = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || email.split('@')[0],
        companyId: platformCompany.id,
        role: 'ADMIN',
        isPlatformAdmin: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: newMember,
      message: `Platform team member "${newMember.name}" created successfully`,
    });
  } catch (error) {
    console.error('Platform: create team member error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create platform team member' },
      { status: 500 }
    );
  }
}
