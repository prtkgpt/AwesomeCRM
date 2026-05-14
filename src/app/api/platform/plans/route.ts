import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Helper: verify platform admin
async function verifyPlatformAdmin(session: any) {
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPlatformAdmin: true },
  });
  return user?.isPlatformAdmin === true;
}

// GET /api/platform/plans - List all platform plans
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await verifyPlatformAdmin(session))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const plans = await prisma.platformPlan.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('Platform plans: list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}

// POST /api/platform/plans - Create a new plan
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
    const { name, displayName, price, maxClients, maxUsers, maxBookingsPerMonth, features } = body;

    if (!name || !displayName) {
      return NextResponse.json(
        { success: false, error: 'Name and displayName are required' },
        { status: 400 }
      );
    }

    // Check uniqueness
    const existing = await prisma.platformPlan.findUnique({
      where: { name },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A plan with this name already exists' },
        { status: 409 }
      );
    }

    const plan = await prisma.platformPlan.create({
      data: {
        name,
        displayName,
        price: price || 0,
        maxClients: maxClients || null,
        maxUsers: maxUsers || null,
        maxBookingsPerMonth: maxBookingsPerMonth || null,
        features: features || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: plan,
      message: `Plan "${displayName}" created`,
    });
  } catch (error) {
    console.error('Platform plans: create error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create plan' },
      { status: 500 }
    );
  }
}
