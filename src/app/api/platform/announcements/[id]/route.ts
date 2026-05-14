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

// PATCH /api/platform/announcements/[id] - Update an announcement
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

    const announcement = await prisma.announcement.findUnique({
      where: { id: params.id },
    });

    if (!announcement) {
      return NextResponse.json(
        { success: false, error: 'Announcement not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { title, message, type, targetPlans, dismissible, isActive, expiresAt } = body;

    const updated = await prisma.announcement.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(message !== undefined && { message }),
        ...(type !== undefined && { type }),
        ...(targetPlans !== undefined && { targetPlans }),
        ...(dismissible !== undefined && { dismissible }),
        ...(isActive !== undefined && { isActive }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Announcement updated',
    });
  } catch (error) {
    console.error('Platform announcements: update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update announcement' },
      { status: 500 }
    );
  }
}

// DELETE /api/platform/announcements/[id] - Delete an announcement
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

    const announcement = await prisma.announcement.findUnique({
      where: { id: params.id },
    });

    if (!announcement) {
      return NextResponse.json(
        { success: false, error: 'Announcement not found' },
        { status: 404 }
      );
    }

    await prisma.announcement.delete({ where: { id: params.id } });

    return NextResponse.json({
      success: true,
      message: 'Announcement deleted',
    });
  } catch (error) {
    console.error('Platform announcements: delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete announcement' },
      { status: 500 }
    );
  }
}
