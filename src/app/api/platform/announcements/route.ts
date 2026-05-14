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

// GET /api/platform/announcements - List all announcements
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await verifyPlatformAdmin(session))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const announcements = await prisma.announcement.findMany({
      include: {
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: announcements,
    });
  } catch (error) {
    console.error('Platform announcements: list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch announcements' },
      { status: 500 }
    );
  }
}

// POST /api/platform/announcements - Create a new announcement
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
    const { title, message, type, targetPlans, dismissible, expiresAt } = body;

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: 'Title and message are required' },
        { status: 400 }
      );
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        type: type || 'info',
        targetPlans: targetPlans || [],
        dismissible: dismissible !== undefined ? dismissible : true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdById: session!.user!.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: announcement,
      message: 'Announcement created',
    });
  } catch (error) {
    console.error('Platform announcements: create error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create announcement' },
      { status: 500 }
    );
  }
}
