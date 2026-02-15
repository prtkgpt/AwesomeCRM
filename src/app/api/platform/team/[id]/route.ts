import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function verifyPlatformAdmin(session: any) {
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPlatformAdmin: true },
  });
  return user?.isPlatformAdmin === true;
}

// DELETE /api/platform/team/[id] - Remove platform admin access from a team member
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

    const { id } = params;

    // Prevent removing yourself
    if (id === session!.user.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot remove yourself from the platform team' },
        { status: 400 }
      );
    }

    // Verify target user is a platform admin
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, isPlatformAdmin: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (!targetUser.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: 'This user is not a platform team member' },
        { status: 400 }
      );
    }

    // Ensure at least one platform admin remains
    const adminCount = await prisma.user.count({
      where: { isPlatformAdmin: true },
    });

    if (adminCount <= 1) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove the last platform admin' },
        { status: 400 }
      );
    }

    // Remove platform admin access by deleting the user
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Platform team member "${targetUser.email}" removed`,
    });
  } catch (error) {
    console.error('Platform: remove team member error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove platform team member' },
      { status: 500 }
    );
  }
}
