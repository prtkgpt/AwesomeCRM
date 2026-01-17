import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// ============================================
// Validation Schemas
// ============================================

const dayScheduleSchema = z.object({
  enabled: z.boolean().default(false),
  start: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  end: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  breakStart: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)').optional(),
  breakEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)').optional(),
});

const dateOverrideSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  type: z.enum(['unavailable', 'custom']),
  reason: z.string().optional(),
  start: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)').optional(),
  end: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)').optional(),
});

const updateScheduleSchema = z.object({
  recurring: z.object({
    monday: dayScheduleSchema.optional(),
    tuesday: dayScheduleSchema.optional(),
    wednesday: dayScheduleSchema.optional(),
    thursday: dayScheduleSchema.optional(),
    friday: dayScheduleSchema.optional(),
    saturday: dayScheduleSchema.optional(),
    sunday: dayScheduleSchema.optional(),
  }).optional(),
  overrides: z.array(dateOverrideSchema).optional(),
  preferredHours: z.number().min(0).max(60).optional(),
  maxJobsPerDay: z.number().min(1).max(20).optional(),
  isAvailable: z.boolean().optional(),
});

// Default availability schedule
const defaultSchedule = {
  recurring: {
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '17:00' },
    sunday: { enabled: false, start: '09:00', end: '17:00' },
  },
  overrides: [],
};

// ============================================
// GET /api/team/[id]/schedule - Get availability schedule
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can view team member schedules
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get team member with availability
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      select: {
        id: true,
        companyId: true,
        availability: true,
        preferredHours: true,
        maxJobsPerDay: true,
        isAvailable: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // Parse availability JSON
    let schedule = defaultSchedule;
    if (teamMember.availability) {
      try {
        const parsed = typeof teamMember.availability === 'string'
          ? JSON.parse(teamMember.availability)
          : teamMember.availability;
        schedule = {
          recurring: { ...defaultSchedule.recurring, ...parsed.recurring },
          overrides: parsed.overrides || [],
        };
      } catch {
        // Use default if parsing fails
      }
    }

    // Get upcoming bookings for this team member (next 30 days)
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    const upcomingBookings = await prisma.booking.findMany({
      where: {
        assignedCleanerId: id,
        scheduledDate: {
          gte: today,
          lte: thirtyDaysLater,
        },
        status: { in: ['PENDING', 'CONFIRMED', 'CLEANER_EN_ROUTE', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        bookingNumber: true,
        scheduledDate: true,
        duration: true,
        status: true,
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        address: {
          select: {
            city: true,
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // Group bookings by date for easy lookup
    const bookingsByDate: Record<string, typeof upcomingBookings> = {};
    upcomingBookings.forEach((booking) => {
      const dateKey = booking.scheduledDate.toISOString().split('T')[0];
      if (!bookingsByDate[dateKey]) {
        bookingsByDate[dateKey] = [];
      }
      bookingsByDate[dateKey].push(booking);
    });

    return NextResponse.json({
      success: true,
      data: {
        teamMember: {
          id: teamMember.id,
          name: `${teamMember.user.firstName || ''} ${teamMember.user.lastName || ''}`.trim(),
          email: teamMember.user.email,
        },
        schedule,
        preferences: {
          preferredHours: teamMember.preferredHours,
          maxJobsPerDay: teamMember.maxJobsPerDay,
          isAvailable: teamMember.isAvailable,
        },
        upcomingBookings,
        bookingsByDate,
      },
    });
  } catch (error) {
    console.error('GET /api/team/[id]/schedule error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/team/[id]/schedule - Update availability schedule
// ============================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can update team member schedules
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateScheduleSchema.parse(body);

    // Get team member
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      select: {
        id: true,
        availability: true,
      },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // Parse existing availability
    let existingSchedule = defaultSchedule;
    if (teamMember.availability) {
      try {
        const parsed = typeof teamMember.availability === 'string'
          ? JSON.parse(teamMember.availability)
          : teamMember.availability;
        existingSchedule = {
          recurring: { ...defaultSchedule.recurring, ...parsed.recurring },
          overrides: parsed.overrides || [],
        };
      } catch {
        // Use default if parsing fails
      }
    }

    // Merge with new data
    const newSchedule = {
      recurring: validatedData.recurring
        ? { ...existingSchedule.recurring, ...validatedData.recurring }
        : existingSchedule.recurring,
      overrides: validatedData.overrides !== undefined
        ? validatedData.overrides
        : existingSchedule.overrides,
    };

    // Validate time ranges
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
    for (const day of days) {
      const daySchedule = newSchedule.recurring[day];
      if (daySchedule && daySchedule.enabled) {
        const startTime = parseInt(daySchedule.start.replace(':', ''));
        const endTime = parseInt(daySchedule.end.replace(':', ''));
        if (startTime >= endTime) {
          return NextResponse.json(
            { error: `Invalid time range for ${day}: start time must be before end time` },
            { status: 400 }
          );
        }

        // Validate break times if provided
        if (daySchedule.breakStart && daySchedule.breakEnd) {
          const breakStartTime = parseInt(daySchedule.breakStart.replace(':', ''));
          const breakEndTime = parseInt(daySchedule.breakEnd.replace(':', ''));
          if (breakStartTime >= breakEndTime) {
            return NextResponse.json(
              { error: `Invalid break time range for ${day}: break start must be before break end` },
              { status: 400 }
            );
          }
          if (breakStartTime < startTime || breakEndTime > endTime) {
            return NextResponse.json(
              { error: `Break times for ${day} must be within work hours` },
              { status: 400 }
            );
          }
        }
      }
    }

    // Update team member
    const updateData: any = {
      availability: JSON.stringify(newSchedule),
    };

    if (validatedData.preferredHours !== undefined) {
      updateData.preferredHours = validatedData.preferredHours;
    }
    if (validatedData.maxJobsPerDay !== undefined) {
      updateData.maxJobsPerDay = validatedData.maxJobsPerDay;
    }
    if (validatedData.isAvailable !== undefined) {
      updateData.isAvailable = validatedData.isAvailable;
    }

    const updated = await prisma.teamMember.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        availability: true,
        preferredHours: true,
        maxJobsPerDay: true,
        isAvailable: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Parse the updated availability for the response
    let parsedSchedule = newSchedule;
    if (updated.availability) {
      try {
        parsedSchedule = typeof updated.availability === 'string'
          ? JSON.parse(updated.availability)
          : updated.availability;
      } catch {
        // Use newSchedule if parsing fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        teamMember: {
          id: updated.id,
          name: `${updated.user.firstName || ''} ${updated.user.lastName || ''}`.trim(),
        },
        schedule: parsedSchedule,
        preferences: {
          preferredHours: updated.preferredHours,
          maxJobsPerDay: updated.maxJobsPerDay,
          isAvailable: updated.isAvailable,
        },
      },
      message: 'Schedule updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/team/[id]/schedule error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid schedule data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}
