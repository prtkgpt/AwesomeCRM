import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only cleaners can access this endpoint
    if (user.role !== 'CLEANER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get URL search params for filtering
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const serviceType = searchParams.get('serviceType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    // Get the cleaner's TeamMember record
    const teamMember = await prisma.teamMember.findUnique({
      where: { userId: session.user.id },
      include: {
        company: {
          select: {
            timezone: true,
            name: true,
          },
        },
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Cleaner profile not found' },
        { status: 404 }
      );
    }

    // Build where clause for filtering - ONLY jobs assigned to this cleaner
    const whereClause: any = {
      assignedTo: teamMember.id, // Data isolation: only this cleaner's jobs
      status: {
        in: ['COMPLETED', 'CLEANER_COMPLETED'],
      },
    };

    // Apply service type filter
    if (serviceType && serviceType !== 'all') {
      whereClause.serviceType = serviceType;
    }

    // Apply date range filter
    if (startDate) {
      whereClause.scheduledDate = {
        ...whereClause.scheduledDate,
        gte: new Date(startDate),
      };
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      whereClause.scheduledDate = {
        ...whereClause.scheduledDate,
        lte: endDateTime,
      };
    }

    // Apply search filter (client name or address)
    if (search) {
      whereClause.OR = [
        {
          client: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          address: {
            street: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          address: {
            city: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.booking.count({
      where: whereClause,
    });

    // Get paginated jobs
    const jobs = await prisma.booking.findMany({
      where: whereClause,
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
        scheduledDate: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Calculate wage for each job (hide actual price from cleaners)
    const jobsWithWage = jobs.map((job) => {
      const hours = job.duration / 60;
      const wage = hours * (teamMember.hourlyRate || 0);
      const { price, ...jobWithoutPrice } = job;
      return {
        ...jobWithoutPrice,
        wage: Math.round(wage * 100) / 100,
        hourlyRate: teamMember.hourlyRate || 0,
        tip: job.tipAmount || 0,
        totalEarned: Math.round((wage + (job.tipAmount || 0)) * 100) / 100,
      };
    });

    // Get stats for filtered results
    const allFilteredJobs = await prisma.booking.findMany({
      where: whereClause,
      select: {
        duration: true,
        tipAmount: true,
        serviceType: true,
      },
    });

    const totalWages = allFilteredJobs.reduce((sum, job) => {
      const hours = job.duration / 60;
      return sum + (hours * (teamMember.hourlyRate || 0));
    }, 0);

    const totalTips = allFilteredJobs.reduce((sum, job) => sum + (job.tipAmount || 0), 0);
    const totalHours = allFilteredJobs.reduce((sum, job) => sum + job.duration, 0) / 60;

    // Get service type breakdown
    const serviceTypeBreakdown: Record<string, number> = {};
    allFilteredJobs.forEach((job) => {
      const type = job.serviceType || 'STANDARD';
      serviceTypeBreakdown[type] = (serviceTypeBreakdown[type] || 0) + 1;
    });

    // Get unique service types for filter dropdown
    const allServiceTypes = await prisma.booking.findMany({
      where: {
        assignedTo: teamMember.id,
        status: {
          in: ['COMPLETED', 'CLEANER_COMPLETED'],
        },
      },
      select: {
        serviceType: true,
      },
      distinct: ['serviceType'],
    });

    const serviceTypes = [...new Set(allServiceTypes.map((j) => j.serviceType || 'STANDARD'))];

    return NextResponse.json({
      success: true,
      data: {
        jobs: jobsWithWage,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: page * limit < totalCount,
        },
        stats: {
          totalJobs: totalCount,
          totalWages: Math.round(totalWages * 100) / 100,
          totalTips: Math.round(totalTips * 100) / 100,
          totalEarned: Math.round((totalWages + totalTips) * 100) / 100,
          totalHours: Math.round(totalHours * 10) / 10,
          avgPerJob: totalCount > 0 ? Math.round(((totalWages + totalTips) / totalCount) * 100) / 100 : 0,
        },
        serviceTypeBreakdown,
        serviceTypes,
      },
    });
  } catch (error) {
    console.error('Failed to fetch cleaner job history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job history' },
      { status: 500 }
    );
  }
}
