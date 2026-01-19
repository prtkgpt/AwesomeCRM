import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendTimeOffDeniedNotification } from '@/lib/notifications';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/team/time-off/[id]/deny - Deny a time off request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const timeOffRequest = await prisma.timeOffRequest.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    });

    if (!timeOffRequest) {
      return NextResponse.json(
        { error: 'Time off request not found' },
        { status: 404 }
      );
    }

    if (timeOffRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only deny pending requests' },
        { status: 400 }
      );
    }

    // Parse body for optional reason/notes
    let reason = null;
    try {
      const body = await request.json();
      reason = body.reason || body.notes || null;
    } catch {
      // No body or invalid JSON, that's fine
    }

    // Update the request status
    const updatedRequest = await prisma.timeOffRequest.update({
      where: { id },
      data: {
        status: 'DENIED',
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        reviewNotes: reason,
      },
    });

    // Send notification to cleaner
    await sendTimeOffDeniedNotification(id);

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: 'Time off request denied',
    });
  } catch (error) {
    console.error('POST /api/team/time-off/[id]/deny error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deny time off request' },
      { status: 500 }
    );
  }
}
