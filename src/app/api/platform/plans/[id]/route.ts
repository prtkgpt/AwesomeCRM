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

// PATCH /api/platform/plans/[id] - Update a plan
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

    const plan = await prisma.platformPlan.findUnique({
      where: { id: params.id },
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, displayName, price, maxClients, maxUsers, maxBookingsPerMonth, features, isActive, sortOrder } = body;

    // If changing name, check uniqueness
    if (name && name !== plan.name) {
      const existing = await prisma.platformPlan.findUnique({ where: { name } });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'A plan with this name already exists' },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.platformPlan.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(displayName !== undefined && { displayName }),
        ...(price !== undefined && { price }),
        ...(maxClients !== undefined && { maxClients }),
        ...(maxUsers !== undefined && { maxUsers }),
        ...(maxBookingsPerMonth !== undefined && { maxBookingsPerMonth }),
        ...(features !== undefined && { features }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Plan updated',
    });
  } catch (error) {
    console.error('Platform plans: update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update plan' },
      { status: 500 }
    );
  }
}

// DELETE /api/platform/plans/[id] - Soft delete a plan (set isActive = false)
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

    const plan = await prisma.platformPlan.findUnique({
      where: { id: params.id },
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.platformPlan.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Plan deactivated',
    });
  } catch (error) {
    console.error('Platform plans: delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate plan' },
      { status: 500 }
    );
  }
}
