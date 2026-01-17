import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Action types
type JobAction = 'on-my-way' | 'clock-in' | 'clock-out' | 'mark-complete' | 'arrived';

interface ActionRequest {
  action: JobAction;
  location?: {
    lat: number;
    lng: number;
    accuracy?: number;
    timestamp?: string;
  };
  notes?: string;
}

// POST /api/cleaner/jobs/[id]/actions - Perform job actions (clock in, clock out, on-my-way, mark complete)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = params.id;
    const body: ActionRequest = await request.json();
    const { action, location, notes } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required. Valid actions: on-my-way, clock-in, clock-out, mark-complete, arrived' },
        { status: 400 }
      );
    }

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true, firstName: true, lastName: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only cleaners can perform job actions
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
          },
        },
        address: {
          select: {
            street: true,
            city: true,
            state: true,
            lat: true,
            lng: true,
          },
        },
        company: {
          select: {
            name: true,
            twilioAccountSid: true,
            twilioAuthToken: true,
            twilioPhoneNumber: true,
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

    const now = new Date();
    const cleanerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Your cleaner';
    const clientName = `${job.client.firstName} ${job.client.lastName || ''}`.trim();

    let updateData: any = {};
    let statusUpdate: string | null = null;
    let message = '';
    let timeEntryData: any = null;

    switch (action) {
      case 'on-my-way':
        // Validate: Can only mark on-my-way if not already done
        if (job.onMyWayAt) {
          return NextResponse.json(
            { error: 'Already marked as "On My Way" for this job' },
            { status: 400 }
          );
        }

        updateData = {
          onMyWayAt: now,
          status: 'CLEANER_EN_ROUTE',
        };
        statusUpdate = 'CLEANER_EN_ROUTE';
        message = `Marked as "On My Way" to ${clientName}`;

        // Optionally send SMS notification to client (if configured)
        // This would integrate with Twilio in a production environment

        break;

      case 'arrived':
        // Validate: Must have marked on-my-way first (optional) and not already arrived
        if (job.arrivedAt) {
          return NextResponse.json(
            { error: 'Already marked as arrived for this job' },
            { status: 400 }
          );
        }

        updateData = {
          arrivedAt: now,
        };

        // Store arrival location if provided
        if (location?.lat && location?.lng) {
          updateData.statusHistory = [
            ...((job.statusHistory as any[]) || []),
            {
              action: 'arrived',
              timestamp: now.toISOString(),
              userId: user.id,
              location: {
                lat: location.lat,
                lng: location.lng,
                accuracy: location.accuracy,
              },
            },
          ];
        }

        message = `Marked as arrived at ${job.address.street}, ${job.address.city}`;
        break;

      case 'clock-in':
        // Validate: Cannot clock in twice
        if (job.clockedInAt) {
          return NextResponse.json(
            { error: 'Already clocked in to this job' },
            { status: 400 }
          );
        }

        // Validate: Job should not be completed or cancelled
        if (['COMPLETED', 'CLEANER_COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(job.status)) {
          return NextResponse.json(
            { error: `Cannot clock in - job status is ${job.status}` },
            { status: 400 }
          );
        }

        updateData = {
          clockedInAt: now,
          status: 'IN_PROGRESS',
        };

        // Set arrived time if not already set
        if (!job.arrivedAt) {
          updateData.arrivedAt = now;
        }

        // Set on-my-way if not already set
        if (!job.onMyWayAt) {
          updateData.onMyWayAt = now;
        }

        statusUpdate = 'IN_PROGRESS';
        message = `Clocked in at ${job.address.street}, ${job.address.city}`;

        // Create time entry for tracking
        timeEntryData = {
          teamMemberId: teamMember.id,
          bookingId: jobId,
          clockIn: now,
          clockInLat: location?.lat || null,
          clockInLng: location?.lng || null,
          notes: notes || null,
        };

        break;

      case 'clock-out':
        // Validate: Must have clocked in first
        if (!job.clockedInAt) {
          return NextResponse.json(
            { error: 'Must clock in before clocking out' },
            { status: 400 }
          );
        }

        // Validate: Cannot clock out twice
        if (job.clockedOutAt) {
          return NextResponse.json(
            { error: 'Already clocked out from this job' },
            { status: 400 }
          );
        }

        // Calculate duration
        const clockInTime = new Date(job.clockedInAt);
        const durationMinutes = Math.round((now.getTime() - clockInTime.getTime()) / (1000 * 60));
        const durationHours = durationMinutes / 60;
        const earnedWage = teamMember.hourlyRate ? teamMember.hourlyRate * durationHours : 0;

        updateData = {
          clockedOutAt: now,
          actualDuration: durationMinutes,
        };

        message = `Clocked out. Duration: ${durationMinutes} minutes. Estimated earnings: $${earnedWage.toFixed(2)}`;

        // Update the time entry
        const existingTimeEntry = await prisma.timeEntry.findFirst({
          where: {
            bookingId: jobId,
            teamMemberId: teamMember.id,
            clockOut: null,
          },
        });

        if (existingTimeEntry) {
          await prisma.timeEntry.update({
            where: { id: existingTimeEntry.id },
            data: {
              clockOut: now,
              clockOutLat: location?.lat || null,
              clockOutLng: location?.lng || null,
              totalMinutes: durationMinutes,
              notes: notes ? `${existingTimeEntry.notes || ''}\nClock out: ${notes}`.trim() : existingTimeEntry.notes,
            },
          });
        }

        break;

      case 'mark-complete':
        // Validate: Must have clocked in
        if (!job.clockedInAt) {
          return NextResponse.json(
            { error: 'Must clock in before marking complete' },
            { status: 400 }
          );
        }

        // Validate: Cannot complete if already completed
        if (['COMPLETED', 'CLEANER_COMPLETED'].includes(job.status)) {
          return NextResponse.json(
            { error: 'Job is already marked as completed' },
            { status: 400 }
          );
        }

        // Calculate duration if not clocked out yet
        let finalDuration = job.actualDuration;
        if (!job.clockedOutAt) {
          const clockInTimeForComplete = new Date(job.clockedInAt);
          finalDuration = Math.round((now.getTime() - clockInTimeForComplete.getTime()) / (1000 * 60));
        }

        // Generate feedback token if doesn't exist
        const feedbackToken = job.feedbackToken || `fb_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

        updateData = {
          status: 'CLEANER_COMPLETED',
          completedAt: now,
          completedById: user.id,
          feedbackToken: feedbackToken,
          actualDuration: finalDuration,
        };

        // Clock out if not already done
        if (!job.clockedOutAt) {
          updateData.clockedOutAt = now;

          // Update time entry
          const timeEntryForComplete = await prisma.timeEntry.findFirst({
            where: {
              bookingId: jobId,
              teamMemberId: teamMember.id,
              clockOut: null,
            },
          });

          if (timeEntryForComplete) {
            await prisma.timeEntry.update({
              where: { id: timeEntryForComplete.id },
              data: {
                clockOut: now,
                clockOutLat: location?.lat || null,
                clockOutLng: location?.lng || null,
                totalMinutes: finalDuration,
              },
            });
          }
        }

        statusUpdate = 'CLEANER_COMPLETED';
        message = 'Job marked as completed and sent for review';
        break;

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Valid actions: on-my-way, clock-in, clock-out, mark-complete, arrived` },
          { status: 400 }
        );
    }

    // Update status history
    const statusHistory = (job.statusHistory as any[]) || [];
    statusHistory.push({
      action,
      status: statusUpdate || job.status,
      timestamp: now.toISOString(),
      userId: user.id,
      userName: cleanerName,
      location: location ? {
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy,
      } : undefined,
      notes: notes || undefined,
    });
    updateData.statusHistory = statusHistory;

    // Update the booking
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
      },
    });

    // Create time entry if needed (for clock-in)
    if (timeEntryData) {
      await prisma.timeEntry.create({
        data: timeEntryData,
      });
    }

    // Update team member stats if completing job
    if (action === 'mark-complete') {
      await prisma.teamMember.update({
        where: { id: teamMember.id },
        data: {
          totalJobsCompleted: { increment: 1 },
        },
      });
    }

    console.log(`Job ${jobId} action '${action}' performed by cleaner ${user.id}`);

    return NextResponse.json({
      success: true,
      message,
      action,
      data: {
        id: updatedJob.id,
        bookingNumber: updatedJob.bookingNumber,
        status: updatedJob.status,
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
      },
      location: location ? {
        recorded: true,
        lat: location.lat,
        lng: location.lng,
      } : {
        recorded: false,
      },
    });
  } catch (error) {
    console.error('POST /api/cleaner/jobs/[id]/actions error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to perform action: ${error.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}

// GET /api/cleaner/jobs/[id]/actions - Get available actions for a job
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

    // Get the job
    const job = await prisma.booking.findFirst({
      where: {
        id: jobId,
        assignedCleanerId: teamMember.id,
        companyId: user.companyId,
      },
      select: {
        id: true,
        status: true,
        onMyWayAt: true,
        arrivedAt: true,
        clockedInAt: true,
        clockedOutAt: true,
        completedAt: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or not assigned to you' },
        { status: 404 }
      );
    }

    // Determine available actions based on current state
    const availableActions: Array<{
      action: JobAction;
      label: string;
      description: string;
      requiresLocation: boolean;
    }> = [];

    // On My Way - available if not already done and job is not in progress or completed
    if (!job.onMyWayAt && !['IN_PROGRESS', 'CLEANER_COMPLETED', 'COMPLETED', 'CANCELLED'].includes(job.status)) {
      availableActions.push({
        action: 'on-my-way',
        label: 'On My Way',
        description: 'Notify the client that you are on your way',
        requiresLocation: true,
      });
    }

    // Arrived - available if on-my-way but not arrived yet
    if (job.onMyWayAt && !job.arrivedAt && !job.clockedInAt) {
      availableActions.push({
        action: 'arrived',
        label: 'Arrived',
        description: 'Mark that you have arrived at the location',
        requiresLocation: true,
      });
    }

    // Clock In - available if not clocked in and job is not completed
    if (!job.clockedInAt && !['CLEANER_COMPLETED', 'COMPLETED', 'CANCELLED'].includes(job.status)) {
      availableActions.push({
        action: 'clock-in',
        label: 'Clock In',
        description: 'Start working on this job',
        requiresLocation: true,
      });
    }

    // Clock Out - available if clocked in but not clocked out
    if (job.clockedInAt && !job.clockedOutAt) {
      availableActions.push({
        action: 'clock-out',
        label: 'Clock Out',
        description: 'Stop the timer for this job',
        requiresLocation: true,
      });
    }

    // Mark Complete - available if clocked in and job is not completed
    if (job.clockedInAt && !['CLEANER_COMPLETED', 'COMPLETED'].includes(job.status)) {
      availableActions.push({
        action: 'mark-complete',
        label: 'Mark Complete',
        description: 'Submit this job for review',
        requiresLocation: true,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        currentStatus: job.status,
        timeline: {
          onMyWayAt: job.onMyWayAt,
          arrivedAt: job.arrivedAt,
          clockedInAt: job.clockedInAt,
          clockedOutAt: job.clockedOutAt,
          completedAt: job.completedAt,
        },
        availableActions,
      },
    });
  } catch (error) {
    console.error('GET /api/cleaner/jobs/[id]/actions error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to get available actions: ${error.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to get available actions' },
      { status: 500 }
    );
  }
}
