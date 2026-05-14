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

// GET /api/platform/coupons - List all coupon codes
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await verifyPlatformAdmin(session))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const coupons = await prisma.couponCode.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: coupons,
    });
  } catch (error) {
    console.error('Platform coupons: list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}

// POST /api/platform/coupons - Create a new coupon
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
    const { code, description, discountType, discountValue, trialDays, maxUses, expiresAt } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Coupon code is required' },
        { status: 400 }
      );
    }

    // Check uniqueness
    const existing = await prisma.couponCode.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A coupon with this code already exists' },
        { status: 409 }
      );
    }

    const coupon = await prisma.couponCode.create({
      data: {
        code: code.toUpperCase(),
        description: description || null,
        discountType: discountType || 'percent',
        discountValue: discountValue || 0,
        trialDays: trialDays || null,
        maxUses: maxUses || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: coupon,
      message: `Coupon "${coupon.code}" created`,
    });
  } catch (error) {
    console.error('Platform coupons: create error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create coupon' },
      { status: 500 }
    );
  }
}
