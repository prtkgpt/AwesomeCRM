import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BookingStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/cleaner/jobs/[id] - Get single job details with client info, address, checklist
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = params.id;

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

    // Fetch the job with all related data
    const job = await prisma.booking.findFirst({
      where: {
        id: jobId,
        assignedCleanerId: teamMember.id,
        companyId: user.companyId,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            preferredContactMethod: true,
            notes: true,
            isVip: true,
            preferences: {
              select: {
                cleaningSequence: true,
                priorityAreas: true,
                areasToAvoid: true,
                productAllergies: true,
                preferredProducts: true,
                customerProvidesProducts: true,
                avoidScents: true,
                ecoFriendlyOnly: true,
                petHandlingInstructions: true,
                plantWatering: true,
                plantInstructions: true,
                trashTakeout: true,
                otherTasks: true,
                lastVisitNotes: true,
              },
            },
          },
        },
        address: {
          select: {
            id: true,
            label: true,
            street: true,
            unit: true,
            city: true,
            state: true,
            zip: true,
            country: true,
            lat: true,
            lng: true,
            formattedAddress: true,
            propertyType: true,
            squareFootage: true,
            bedrooms: true,
            bathrooms: true,
            floors: true,
            hasBasement: true,
            hasGarage: true,
            hasYard: true,
            hasPool: true,
            parkingInfo: true,
            gateCode: true,
            alarmCode: true,
            lockboxCode: true,
            keyLocation: true,
            entryInstructions: true,
            hasPets: true,
            petDetails: true,
            petInstructions: true,
            cleanerNotes: true,
            specialInstructions: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            baseDuration: true,
            includedTasks: true,
            excludedTasks: true,
          },
        },
        checklist: {
          select: {
            id: true,
            items: true,
            totalTasks: true,
            completedTasks: true,
            startedAt: true,
            completedAt: true,
          },
        },
        photos: {
          select: {
            id: true,
            type: true,
            area: true,
            url: true,
            thumbnailUrl: true,
            caption: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        company: {
          select: {
            name: true,
            phone: true,
            timezone: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or not assigned to you' },
        { status: 404 }
      );
    }

    // Calculate estimated wage (hide customer price)
    const durationHours = job.duration / 60;
    const estimatedWage = teamMember.hourlyRate ? teamMember.hourlyRate * durationHours : 0;

    // Calculate actual wage if job is completed
    let actualWage = null;
    if (job.clockedInAt && job.clockedOutAt) {
      const actualMinutes = (new Date(job.clockedOutAt).getTime() - new Date(job.clockedInAt).getTime()) / (1000 * 60);
      const actualHours = actualMinutes / 60;
      actualWage = teamMember.hourlyRate ? parseFloat((teamMember.hourlyRate * actualHours).toFixed(2)) : null;
    }

    // Format the response
    const jobDetails = {
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
      // Client info
      client: {
        id: job.client.id,
        name: `${job.client.firstName} ${job.client.lastName || ''}`.trim(),
        phone: job.client.phone,
        email: job.client.email,
        preferredContactMethod: job.client.preferredContactMethod,
        notes: job.client.notes,
        isVip: job.client.isVip,
        preferences: job.client.preferences,
      },
      // Full address details
      address: job.address,
      // Wages (not prices)
      estimatedWage: parseFloat(estimatedWage.toFixed(2)),
      actualWage,
      hourlyRate: teamMember.hourlyRate || 0,
      tipAmount: job.tipAmount,
      // Notes
      cleanerNotes: job.cleanerNotes,
      customerNotes: job.customerNotes,
      internalNotes: job.internalNotes,
      // Timeline
      onMyWayAt: job.onMyWayAt,
      arrivedAt: job.arrivedAt,
      clockedInAt: job.clockedInAt,
      clockedOutAt: job.clockedOutAt,
      completedAt: job.completedAt,
      actualDuration: job.actualDuration,
      // Checklist
      checklist: job.checklist ? {
        id: job.checklist.id,
        items: job.checklist.items,
        totalTasks: job.checklist.totalTasks,
        completedTasks: job.checklist.completedTasks,
        percentComplete: job.checklist.totalTasks > 0
          ? Math.round((job.checklist.completedTasks / job.checklist.totalTasks) * 100)
          : 0,
        startedAt: job.checklist.startedAt,
        completedAt: job.checklist.completedAt,
      } : null,
      // Photos
      photos: job.photos,
      // Feedback
      customerRating: job.customerRating,
      customerFeedback: job.customerFeedback,
      // Company info
      company: job.company,
      // Timestamps
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };

    return NextResponse.json({
      success: true,
      data: jobDetails,
    });
  } catch (error) {
    console.error('GET /api/cleaner/jobs/[id] error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch job: ${error.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

// PUT /api/cleaner/jobs/[id] - Update job status and notes
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = params.id;
    const body = await request.json();

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true, firstName: true, lastName: true },
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

    // Verify the job exists and is assigned to this cleaner
    const existingJob = await prisma.booking.findFirst({
      where: {
        id: jobId,
        assignedCleanerId: teamMember.id,
        companyId: user.companyId,
      },
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: 'Job not found or not assigned to you' },
        { status: 404 }
      );
    }

    // Validate and extract allowed fields for update
    const { status, cleanerNotes } = body;

    // Build update data
    const updateData: any = {};

    // Cleaners can only update to certain statuses
    if (status) {
      const allowedStatusTransitions: Record<BookingStatus, BookingStatus[]> = {
        PENDING: ['CONFIRMED'],
        CONFIRMED: ['CLEANER_EN_ROUTE', 'IN_PROGRESS'],
        CLEANER_EN_ROUTE: ['IN_PROGRESS'],
        IN_PROGRESS: ['CLEANER_COMPLETED'],
        CLEANER_COMPLETED: [], // Only admin can move from here
        COMPLETED: [],
        CANCELLED: [],
        NO_SHOW: [],
        RESCHEDULED: [],
      };

      const currentStatus = existingJob.status as BookingStatus;
      const allowedStatuses = allowedStatusTransitions[currentStatus] || [];

      if (!allowedStatuses.includes(status as BookingStatus)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from ${currentStatus} to ${status}. Allowed transitions: ${allowedStatuses.join(', ') || 'none'}`,
          },
          { status: 400 }
        );
      }

      updateData.status = status;

      // Update status history
      const statusHistory = (existingJob.statusHistory as any[]) || [];
      statusHistory.push({
        status,
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      });
      updateData.statusHistory = statusHistory;

      // Set timestamps based on status
      if (status === 'CLEANER_EN_ROUTE' && !existingJob.onMyWayAt) {
        updateData.onMyWayAt = new Date();
      }
      if (status === 'IN_PROGRESS' && !existingJob.clockedInAt) {
        updateData.clockedInAt = new Date();
        if (!existingJob.arrivedAt) {
          updateData.arrivedAt = new Date();
        }
      }
      if (status === 'CLEANER_COMPLETED') {
        updateData.completedAt = new Date();
        updateData.completedById = user.id;
        if (existingJob.clockedInAt && !existingJob.clockedOutAt) {
          updateData.clockedOutAt = new Date();
          // Calculate actual duration
          const actualMinutes = Math.round(
            (new Date().getTime() - new Date(existingJob.clockedInAt).getTime()) / (1000 * 60)
          );
          updateData.actualDuration = actualMinutes;
        }
      }
    }

    // Update cleaner notes
    if (cleanerNotes !== undefined) {
      updateData.cleanerNotes = cleanerNotes;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update the job
    const updatedJob = await prisma.booking.update({
      where: { id: jobId },
      data: updateData,
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        address: {
          select: {
            street: true,
            city: true,
            state: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(
      `Job ${jobId} updated by cleaner ${user.id}: ${JSON.stringify(updateData)}`
    );

    return NextResponse.json({
      success: true,
      message: 'Job updated successfully',
      data: {
        id: updatedJob.id,
        bookingNumber: updatedJob.bookingNumber,
        status: updatedJob.status,
        cleanerNotes: updatedJob.cleanerNotes,
        onMyWayAt: updatedJob.onMyWayAt,
        arrivedAt: updatedJob.arrivedAt,
        clockedInAt: updatedJob.clockedInAt,
        clockedOutAt: updatedJob.clockedOutAt,
        completedAt: updatedJob.completedAt,
        actualDuration: updatedJob.actualDuration,
        client: {
          name: `${updatedJob.client.firstName} ${updatedJob.client.lastName || ''}`.trim(),
          phone: updatedJob.client.phone,
        },
        address: {
          street: updatedJob.address.street,
          city: updatedJob.address.city,
          state: updatedJob.address.state,
        },
        service: updatedJob.service?.name,
        updatedAt: updatedJob.updatedAt,
      },
    });
  } catch (error) {
    console.error('PUT /api/cleaner/jobs/[id] error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to update job: ${error.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update job' },
      { status: 500 }
    );
  }
}
