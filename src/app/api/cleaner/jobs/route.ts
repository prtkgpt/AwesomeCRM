import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BookingStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/cleaner/jobs - List assigned jobs with filters and pagination
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
      return NextResponse.json({ error: 'Forbidden - Cleaner role required' }, { status: 403 });
    }

    // Get the cleaner's team member record
    const teamMember = await prisma.teamMember.findUnique({
      where: { userId: user.id },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member profile not found' }, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    // Date filters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Status filter (comma-separated list)
    const statusFilter = searchParams.get('status');
    const statuses = statusFilter
      ? statusFilter.split(',').filter(s => Object.values(BookingStatus).includes(s as BookingStatus)) as BookingStatus[]
      : null;

    // Build where clause
    const whereClause: any = {
      assignedCleanerId: teamMember.id,
      companyId: user.companyId,
    };

    // Apply date range filter
    if (startDate || endDate) {
      whereClause.scheduledDate = {};
      if (startDate) {
        whereClause.scheduledDate.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereClause.scheduledDate.lte = endDateTime;
      }
    }

    // Apply status filter
    if (statuses && statuses.length > 0) {
      whereClause.status = { in: statuses };
    }

    // Get total count for pagination
    const totalCount = await prisma.booking.count({
      where: whereClause,
    });

    // Fetch jobs with pagination
    const jobs = await prisma.booking.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        address: {
          select: {
            id: true,
            street: true,
            unit: true,
            city: true,
            state: true,
            zip: true,
            lat: true,
            lng: true,
            entryInstructions: true,
            parkingInfo: true,
            gateCode: true,
            hasPets: true,
            petDetails: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        checklist: {
          select: {
            id: true,
            totalTasks: true,
            completedTasks: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
      skip,
      take: limit,
    });

    // Transform jobs (hide customer price, show cleaner wage)
    const jobsFormatted = jobs.map((job) => {
      const durationHours = job.duration / 60;
      const estimatedWage = teamMember.hourlyRate ? teamMember.hourlyRate * durationHours : 0;

      return {
        id: job.id,
        bookingNumber: job.bookingNumber,
        scheduledDate: job.scheduledDate,
        scheduledEndDate: job.scheduledEndDate,
        duration: job.duration,
        status: job.status,
        serviceType: job.serviceType,
        service: job.service,
        isRecurring: job.isRecurring,
        recurrenceFrequency: job.recurrenceFrequency,
        client: {
          id: job.client.id,
          name: `${job.client.firstName} ${job.client.lastName || ''}`.trim(),
          phone: job.client.phone,
          email: job.client.email,
        },
        address: job.address,
        estimatedWage: parseFloat(estimatedWage.toFixed(2)),
        cleanerNotes: job.cleanerNotes,
        customerNotes: job.customerNotes,
        // Status timestamps
        onMyWayAt: job.onMyWayAt,
        arrivedAt: job.arrivedAt,
        clockedInAt: job.clockedInAt,
        clockedOutAt: job.clockedOutAt,
        completedAt: job.completedAt,
        // Feedback
        customerRating: job.customerRating,
        customerFeedback: job.customerFeedback,
        tipAmount: job.tipAmount,
        // Checklist progress
        checklist: job.checklist ? {
          id: job.checklist.id,
          totalTasks: job.checklist.totalTasks,
          completedTasks: job.checklist.completedTasks,
          percentComplete: job.checklist.totalTasks > 0
            ? Math.round((job.checklist.completedTasks / job.checklist.totalTasks) * 100)
            : 0,
        } : null,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        jobs: jobsFormatted,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPreviousPage,
        },
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
          statuses: statuses || [],
        },
      },
    });
  } catch (error) {
    console.error('GET /api/cleaner/jobs error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch jobs: ${error.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
