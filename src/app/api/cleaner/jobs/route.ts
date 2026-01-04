import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/cleaner/jobs - Get cleaner's assigned jobs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only cleaners can access this endpoint
    if (user.role !== 'CLEANER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the cleaner's team member record
    const teamMember = await prisma.teamMember.findUnique({
      where: { userId: user.id },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member profile not found' }, { status: 404 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const tomorrow = new Date(todayEnd.getTime() + 1);

    // Get today's jobs
    const todayJobs = await prisma.booking.findMany({
      where: {
        assignedTo: teamMember.id,
        scheduledDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        client: {
          select: {
            name: true,
            phone: true,
          },
        },
        address: {
          select: {
            street: true,
            city: true,
            state: true,
            zip: true,
            gateCode: true,
            parkingInfo: true,
            petInfo: true,
            preferences: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    // Get upcoming jobs (next 7 days)
    const nextWeek = new Date(tomorrow);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingJobs = await prisma.booking.findMany({
      where: {
        assignedTo: teamMember.id,
        scheduledDate: {
          gte: tomorrow,
          lt: nextWeek,
        },
        status: 'SCHEDULED',
      },
      include: {
        client: {
          select: {
            name: true,
            phone: true,
          },
        },
        address: {
          select: {
            street: true,
            city: true,
            state: true,
            zip: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      todayJobs,
      upcomingJobs,
    });
  } catch (error) {
    console.error('GET /api/cleaner/jobs error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
