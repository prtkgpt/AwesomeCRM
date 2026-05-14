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

// PATCH /api/platform/coupons/[id] - Update a coupon
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await verifyPlatformAdmin(session))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const coupon = await prisma.couponCode.findUnique({
      where: { id: params.id },
    });

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { code, description, discountType, discountValue, trialDays, maxUses, isActive, expiresAt } = body;

    // If changing code, check uniqueness
    if (code && code.toUpperCase() !== coupon.code) {
      const existing = await prisma.couponCode.findUnique({ where: { code: code.toUpperCase() } });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'A coupon with this code already exists' },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.couponCode.update({
      where: { id: params.id },
      data: {
        ...(code !== undefined && { code: code.toUpperCase() }),
        ...(description !== undefined && { description }),
        ...(discountType !== undefined && { discountType }),
        ...(discountValue !== undefined && { discountValue }),
        ...(trialDays !== undefined && { trialDays }),
        ...(maxUses !== undefined && { maxUses }),
        ...(isActive !== undefined && { isActive }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Coupon updated',
    });
  } catch (error) {
    console.error('Platform coupons: update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update coupon' },
      { status: 500 }
    );
  }
}

// DELETE /api/platform/coupons/[id] - Deactivate a coupon (set isActive = false)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await verifyPlatformAdmin(session))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const coupon = await prisma.couponCode.findUnique({
      where: { id: params.id },
    });

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.couponCode.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Coupon deactivated',
    });
  } catch (error) {
    console.error('Platform coupons: delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate coupon' },
      { status: 500 }
    );
  }
}
