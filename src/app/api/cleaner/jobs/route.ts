import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/cleaner/jobs - Get cleaner's assigned jobs + unassigned jobs
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

    console.log('🟢 CLEANER JOBS - User:', user.id);
    console.log('🟢 CLEANER JOBS - TeamMember ID:', teamMember.id);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const tomorrow = new Date(todayEnd.getTime() + 1);

    console.log('🟢 CLEANER JOBS - Today range:', todayStart, 'to', todayEnd);
    console.log('🟢 CLEANER JOBS - Current time:', now);

    // Get today's jobs (assigned to this cleaner OR unassigned)
    const todayJobsRaw = await prisma.booking.findMany({
      where: {
        companyId: user.companyId, // Only jobs from the same company
        scheduledDate: {
          gte: todayStart,
          lte: todayEnd,
        },
        OR: [
          { assignedTo: teamMember.id }, // Assigned to this cleaner
          { assignedTo: null },          // Unassigned jobs
        ],
      },
      include: {
        client: {
          select: {
            name: true,
            phone: true,
            preferences: true, // Include client preferences
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

    // Calculate wage for each job (hide total price from cleaners)
    const todayJobs = todayJobsRaw.map(job => {
      const durationHours = job.duration / 60; // Convert minutes to hours
      const wage = teamMember.hourlyRate ? teamMember.hourlyRate * durationHours : 0;

      // Return job without price, add wage and hourlyRate instead
      const { price, ...jobWithoutPrice } = job;
      return {
        ...jobWithoutPrice,
        wage: parseFloat(wage.toFixed(2)), // Cleaner's wage
        hourlyRate: teamMember.hourlyRate || 0, // Cleaner's hourly rate
      };
    });

    console.log('🟢 CLEANER JOBS - Found today jobs:', todayJobs.length);
    if (todayJobs.length > 0) {
      console.log('🟢 CLEANER JOBS - Today jobs:', todayJobs.map(j => ({
        id: j.id.slice(0, 8),
        scheduledDate: j.scheduledDate,
        client: j.client.name
      })));
    }

    // Get upcoming jobs (next 7 days) - assigned to this cleaner OR unassigned
    const nextWeek = new Date(tomorrow);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingJobsRaw = await prisma.booking.findMany({
      where: {
        companyId: user.companyId, // Only jobs from the same company
        scheduledDate: {
          gte: tomorrow,
          lt: nextWeek,
        },
        status: 'SCHEDULED',
        OR: [
          { assignedTo: teamMember.id }, // Assigned to this cleaner
          { assignedTo: null },          // Unassigned jobs
        ],
      },
      include: {
        client: {
          select: {
            name: true,
            phone: true,
            preferences: true, // Include client preferences
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

    // Calculate wage for upcoming jobs (hide total price from cleaners)
    const upcomingJobs = upcomingJobsRaw.map(job => {
      const durationHours = job.duration / 60; // Convert minutes to hours
      const wage = teamMember.hourlyRate ? teamMember.hourlyRate * durationHours : 0;

      // Return job without price, add wage and hourlyRate instead
      const { price, ...jobWithoutPrice } = job;
      return {
        ...jobWithoutPrice,
        wage: parseFloat(wage.toFixed(2)), // Cleaner's wage
        hourlyRate: teamMember.hourlyRate || 0, // Cleaner's hourly rate
      };
    });

    console.log('🟢 CLEANER JOBS - Found upcoming jobs:', upcomingJobs.length);
    if (upcomingJobs.length > 0) {
      console.log('🟢 CLEANER JOBS - Upcoming jobs:', upcomingJobs.map(j => ({
        id: j.id.slice(0, 8),
        scheduledDate: j.scheduledDate,
        client: j.client.name
      })));
    }

    return NextResponse.json({
      success: true,
      todayJobs,
      upcomingJobs,
    });
  } catch (error) {
    console.error('🔴 GET /api/cleaner/jobs error:', error);

    if (error instanceof Error && error.message) {
      console.error('🔴 Error message:', error.message);
      console.error('🔴 Error stack:', error.stack);
      return NextResponse.json({
        success: false,
        error: `Failed to fetch jobs: ${error.message}`,
        details: error.stack
      }, { status: 500 });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch jobs - unknown error' },
      { status: 500 }
    );
  }
}
