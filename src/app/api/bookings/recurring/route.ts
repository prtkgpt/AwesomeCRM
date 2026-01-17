// ============================================
// CleanDayCRM - Recurring Bookings API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, generateBookingNumber } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createBookingSchema } from '@/lib/validations';
import { generateRecurringDates } from '@/lib/utils';
import { findBestCleaner } from '@/lib/cleaner-assignment';
import { z } from 'zod';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Validation schema for recurring series creation
const createRecurringSeriesSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  addressId: z.string().min(1, 'Address is required'),
  serviceId: z.string().optional(),
  serviceType: z.enum(['STANDARD', 'DEEP', 'MOVE_IN', 'MOVE_OUT', 'POST_CONSTRUCTION', 'POST_PARTY', 'OFFICE', 'AIRBNB', 'CUSTOM']).default('STANDARD'),
  scheduledDate: z.string().or(z.date()).transform(val => new Date(val)),
  scheduledTime: z.string().optional(), // HH:MM format
  duration: z.number().min(30),
  timeSlot: z.enum(['MORNING', 'AFTERNOON', 'EVENING']).optional(),
  basePrice: z.number().min(0),
  recurrenceFrequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']),
  recurrenceEndDate: z.string().or(z.date()).transform(val => new Date(val)).optional(),
  numberOfOccurrences: z.number().min(1).max(104).optional(), // Max 2 years of weekly
  assignedCleanerId: z.string().optional(),
  autoAssignCleaner: z.boolean().default(false),
  customerNotes: z.string().optional(),
  internalNotes: z.string().optional(),
  cleanerNotes: z.string().optional(),
  locationId: z.string().optional(),
});

// Validation schema for updating recurring series
const updateRecurringSeriesSchema = z.object({
  action: z.enum(['pause', 'resume', 'modify', 'cancel', 'reassign']),
  pausedUntil: z.string().or(z.date()).transform(val => new Date(val)).optional(),
  newScheduledTime: z.string().optional(), // HH:MM format
  newDuration: z.number().min(30).optional(),
  newBasePrice: z.number().min(0).optional(),
  newAssignedCleanerId: z.string().optional().nullable(),
  newRecurrenceFrequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']).optional(),
  newRecurrenceEndDate: z.string().or(z.date()).transform(val => new Date(val)).optional(),
  cancellationReason: z.string().optional(),
  applyToFutureOnly: z.boolean().default(true),
  autoAssignCleaner: z.boolean().default(false),
});

// POST /api/bookings/recurring - Create recurring booking series
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createRecurringSeriesSchema.parse(body);

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only admins/owners can create recurring bookings
    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Verify client and address
    const client = await prisma.client.findFirst({
      where: {
        id: validatedData.clientId,
        companyId: user.companyId,
      },
      include: {
        addresses: {
          where: { id: validatedData.addressId },
        },
        preferences: true,
      },
    });

    if (!client || client.addresses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Client or address not found' },
        { status: 404 }
      );
    }

    // Get company settings
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        taxRate: true,
        minimumBookingPrice: true,
      },
    });

    // Calculate end date
    let endDate: Date;
    if (validatedData.recurrenceEndDate) {
      endDate = validatedData.recurrenceEndDate;
    } else if (validatedData.numberOfOccurrences) {
      // Calculate end date based on number of occurrences
      const msPerOccurrence = validatedData.recurrenceFrequency === 'WEEKLY' ? 7 * 24 * 60 * 60 * 1000
        : validatedData.recurrenceFrequency === 'BIWEEKLY' ? 14 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
      endDate = new Date(validatedData.scheduledDate.getTime() + msPerOccurrence * validatedData.numberOfOccurrences);
    } else {
      // Default to 1 year from start
      endDate = new Date(validatedData.scheduledDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Generate recurring dates
    const recurringDates = generateRecurringDates(
      validatedData.scheduledDate,
      validatedData.recurrenceFrequency,
      endDate,
      104 // Max 2 years of weekly
    );

    // Handle cleaner assignment
    let assignedCleanerId = validatedData.assignedCleanerId || null;
    let assignmentMethod: string | null = null;

    if (validatedData.autoAssignCleaner && !assignedCleanerId) {
      const result = await findBestCleaner({
        clientId: validatedData.clientId,
        addressId: validatedData.addressId,
        scheduledDate: validatedData.scheduledDate,
        duration: validatedData.duration,
        serviceType: validatedData.serviceType,
        companyId: user.companyId,
        preferredCleanerId: client.preferences?.preferredCleaner || undefined,
      });

      if (result.recommended) {
        assignedCleanerId = result.recommended.cleanerId;
        assignmentMethod = 'AUTO';
      }
    } else if (assignedCleanerId) {
      assignmentMethod = 'MANUAL';
    }

    // Calculate pricing
    const taxAmount = validatedData.basePrice * ((company?.taxRate || 0) / 100);
    const finalPrice = validatedData.basePrice + taxAmount;

    // Calculate scheduled end time
    const calculateEndDate = (startDate: Date) => {
      const end = new Date(startDate);
      end.setMinutes(end.getMinutes() + validatedData.duration);
      return end;
    };

    // Create parent booking (first occurrence)
    const parentBooking = await prisma.booking.create({
      data: {
        companyId: user.companyId,
        bookingNumber: generateBookingNumber(),
        clientId: validatedData.clientId,
        addressId: validatedData.addressId,
        createdById: session.user.id,
        serviceId: validatedData.serviceId || null,
        serviceType: validatedData.serviceType,
        locationId: validatedData.locationId || null,
        scheduledDate: validatedData.scheduledDate,
        scheduledEndDate: calculateEndDate(validatedData.scheduledDate),
        duration: validatedData.duration,
        timeSlot: validatedData.timeSlot || null,
        assignedCleanerId,
        assignmentMethod,
        basePrice: validatedData.basePrice,
        subtotal: validatedData.basePrice,
        taxAmount,
        finalPrice,
        customerNotes: validatedData.customerNotes || null,
        internalNotes: validatedData.internalNotes || null,
        cleanerNotes: validatedData.cleanerNotes || null,
        isRecurring: true,
        recurrenceFrequency: validatedData.recurrenceFrequency,
        recurrenceEndDate: endDate,
        status: 'PENDING',
        statusHistory: [
          {
            status: 'PENDING',
            timestamp: new Date().toISOString(),
            userId: session.user.id,
          },
        ],
      },
      include: {
        client: true,
        address: true,
        assignedCleaner: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Create child bookings for remaining occurrences
    const childBookings = await Promise.all(
      recurringDates.map((date) =>
        prisma.booking.create({
          data: {
            companyId: user.companyId,
            bookingNumber: generateBookingNumber(),
            clientId: validatedData.clientId,
            addressId: validatedData.addressId,
            createdById: session.user.id,
            serviceId: validatedData.serviceId || null,
            serviceType: validatedData.serviceType,
            locationId: validatedData.locationId || null,
            scheduledDate: date,
            scheduledEndDate: calculateEndDate(date),
            duration: validatedData.duration,
            timeSlot: validatedData.timeSlot || null,
            assignedCleanerId,
            assignmentMethod,
            basePrice: validatedData.basePrice,
            subtotal: validatedData.basePrice,
            taxAmount,
            finalPrice,
            customerNotes: validatedData.customerNotes || null,
            internalNotes: validatedData.internalNotes || null,
            cleanerNotes: validatedData.cleanerNotes || null,
            isRecurring: true,
            recurrenceFrequency: validatedData.recurrenceFrequency,
            recurrenceParentId: parentBooking.id,
            status: 'PENDING',
            statusHistory: [
              {
                status: 'PENDING',
                timestamp: new Date().toISOString(),
                userId: session.user.id,
              },
            ],
          },
        })
      )
    );

    // Calculate series stats
    const totalBookings = 1 + childBookings.length;
    const totalRevenue = totalBookings * finalPrice;

    return NextResponse.json({
      success: true,
      data: {
        parentBooking,
        totalBookings,
        totalRevenue,
        schedule: {
          frequency: validatedData.recurrenceFrequency,
          startDate: validatedData.scheduledDate,
          endDate,
          nextOccurrences: [validatedData.scheduledDate, ...recurringDates.slice(0, 4)],
        },
        assignment: assignedCleanerId ? {
          cleanerId: assignedCleanerId,
          method: assignmentMethod,
        } : null,
      },
      message: `Created recurring series with ${totalBookings} bookings (${validatedData.recurrenceFrequency.toLowerCase()})`,
    });
  } catch (error) {
    console.error('POST /api/bookings/recurring error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create recurring series' },
      { status: 500 }
    );
  }
}

// PUT /api/bookings/recurring - Update recurring series (pause, resume, modify)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { parentBookingId, ...updateData } = body;

    if (!parentBookingId) {
      return NextResponse.json(
        { success: false, error: 'Parent booking ID is required' },
        { status: 400 }
      );
    }

    const validatedData = updateRecurringSeriesSchema.parse(updateData);

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true, firstName: true, lastName: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get parent booking
    const parentBooking = await prisma.booking.findFirst({
      where: {
        id: parentBookingId,
        companyId: user.companyId,
        isRecurring: true,
        recurrenceParentId: null, // Must be a parent booking
      },
      include: {
        client: {
          include: { preferences: true },
        },
        address: true,
      },
    });

    if (!parentBooking) {
      return NextResponse.json(
        { success: false, error: 'Recurring series not found' },
        { status: 404 }
      );
    }

    // Get all bookings in the series
    const allBookings = await prisma.booking.findMany({
      where: {
        OR: [
          { id: parentBookingId },
          { recurrenceParentId: parentBookingId },
        ],
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // Determine which bookings to update
    const now = new Date();
    const bookingsToUpdate = validatedData.applyToFutureOnly
      ? allBookings.filter(b => new Date(b.scheduledDate) > now && b.status === 'PENDING')
      : allBookings.filter(b => b.status === 'PENDING');

    let updateResult: any = { affected: 0 };

    switch (validatedData.action) {
      case 'pause': {
        // Pause the recurring series
        const pausedUntil = validatedData.pausedUntil || null;

        await prisma.booking.updateMany({
          where: {
            id: { in: bookingsToUpdate.map(b => b.id) },
          },
          data: {
            isPaused: true,
            pausedUntil,
          },
        });

        updateResult = {
          affected: bookingsToUpdate.length,
          action: 'paused',
          pausedUntil,
        };
        break;
      }

      case 'resume': {
        // Resume the recurring series
        await prisma.booking.updateMany({
          where: {
            id: { in: bookingsToUpdate.map(b => b.id) },
          },
          data: {
            isPaused: false,
            pausedUntil: null,
          },
        });

        updateResult = {
          affected: bookingsToUpdate.length,
          action: 'resumed',
        };
        break;
      }

      case 'modify': {
        // Modify recurring series settings
        const modifyData: any = {};

        if (validatedData.newDuration !== undefined) {
          modifyData.duration = validatedData.newDuration;
        }
        if (validatedData.newBasePrice !== undefined) {
          modifyData.basePrice = validatedData.newBasePrice;
          modifyData.subtotal = validatedData.newBasePrice;
          // Recalculate final price with existing tax rate
          const taxRate = (parentBooking.taxAmount / parentBooking.basePrice) * 100;
          modifyData.taxAmount = validatedData.newBasePrice * (taxRate / 100);
          modifyData.finalPrice = validatedData.newBasePrice + modifyData.taxAmount;
        }
        if (validatedData.newScheduledTime !== undefined) {
          // Update time for all future bookings
          const [hours, minutes] = validatedData.newScheduledTime.split(':').map(Number);

          for (const booking of bookingsToUpdate) {
            const newDate = new Date(booking.scheduledDate);
            newDate.setHours(hours, minutes, 0, 0);
            const newEndDate = new Date(newDate);
            newEndDate.setMinutes(newEndDate.getMinutes() + (validatedData.newDuration || booking.duration));

            await prisma.booking.update({
              where: { id: booking.id },
              data: {
                scheduledDate: newDate,
                scheduledEndDate: newEndDate,
                ...modifyData,
              },
            });
          }
        } else if (Object.keys(modifyData).length > 0) {
          await prisma.booking.updateMany({
            where: {
              id: { in: bookingsToUpdate.map(b => b.id) },
            },
            data: modifyData,
          });
        }

        // Update recurrence settings on parent
        if (validatedData.newRecurrenceFrequency || validatedData.newRecurrenceEndDate) {
          await prisma.booking.update({
            where: { id: parentBookingId },
            data: {
              ...(validatedData.newRecurrenceFrequency && { recurrenceFrequency: validatedData.newRecurrenceFrequency }),
              ...(validatedData.newRecurrenceEndDate && { recurrenceEndDate: validatedData.newRecurrenceEndDate }),
            },
          });
        }

        updateResult = {
          affected: bookingsToUpdate.length,
          action: 'modified',
          changes: {
            duration: validatedData.newDuration,
            basePrice: validatedData.newBasePrice,
            scheduledTime: validatedData.newScheduledTime,
            recurrenceFrequency: validatedData.newRecurrenceFrequency,
            recurrenceEndDate: validatedData.newRecurrenceEndDate,
          },
        };
        break;
      }

      case 'cancel': {
        // Cancel all future bookings in the series
        const statusHistory = bookingsToUpdate[0]?.statusHistory || [];

        await Promise.all(
          bookingsToUpdate.map((booking) =>
            prisma.booking.update({
              where: { id: booking.id },
              data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelledById: session.user.id,
                cancellationReason: validatedData.cancellationReason || 'Recurring series cancelled',
                statusHistory: [
                  ...(booking.statusHistory as any[] || []),
                  {
                    status: 'CANCELLED',
                    timestamp: new Date().toISOString(),
                    userId: session.user.id,
                    reason: validatedData.cancellationReason,
                  },
                ],
              },
            })
          )
        );

        updateResult = {
          affected: bookingsToUpdate.length,
          action: 'cancelled',
          reason: validatedData.cancellationReason,
        };
        break;
      }

      case 'reassign': {
        // Reassign cleaner for all future bookings
        let newCleanerId = validatedData.newAssignedCleanerId;
        let newAssignmentMethod: string | null = 'MANUAL';

        if (validatedData.autoAssignCleaner && !newCleanerId) {
          // Auto-assign using AI
          const result = await findBestCleaner({
            clientId: parentBooking.clientId,
            addressId: parentBooking.addressId,
            scheduledDate: parentBooking.scheduledDate,
            duration: parentBooking.duration,
            serviceType: parentBooking.serviceType,
            companyId: user.companyId,
            preferredCleanerId: parentBooking.client.preferences?.preferredCleaner || undefined,
          });

          if (result.recommended) {
            newCleanerId = result.recommended.cleanerId;
            newAssignmentMethod = 'AUTO';
          }
        }

        if (newCleanerId !== undefined) {
          await prisma.booking.updateMany({
            where: {
              id: { in: bookingsToUpdate.map(b => b.id) },
            },
            data: {
              assignedCleanerId: newCleanerId,
              assignmentMethod: newAssignmentMethod,
            },
          });
        }

        updateResult = {
          affected: bookingsToUpdate.length,
          action: 'reassigned',
          newCleanerId,
          method: newAssignmentMethod,
        };
        break;
      }
    }

    // Refetch updated parent booking
    const updatedParent = await prisma.booking.findUnique({
      where: { id: parentBookingId },
      include: {
        client: true,
        address: true,
        assignedCleaner: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Get series summary
    const seriesSummary = await prisma.booking.groupBy({
      by: ['status'],
      where: {
        OR: [
          { id: parentBookingId },
          { recurrenceParentId: parentBookingId },
        ],
      },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        parentBooking: updatedParent,
        updateResult,
        seriesSummary: seriesSummary.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
      },
      message: `Recurring series ${validatedData.action}: ${updateResult.affected} bookings affected`,
    });
  } catch (error) {
    console.error('PUT /api/bookings/recurring error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update recurring series' },
      { status: 500 }
    );
  }
}

// GET /api/bookings/recurring - List all recurring series
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status'); // active, paused, completed, cancelled

    // Get all parent recurring bookings
    const parentBookings = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        isRecurring: true,
        recurrenceParentId: null,
        ...(clientId && { clientId }),
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        address: {
          select: {
            id: true,
            street: true,
            city: true,
            state: true,
            zip: true,
          },
        },
        assignedCleaner: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledDate: 'desc' },
    });

    // Enrich each series with stats
    const enrichedSeries = await Promise.all(
      parentBookings.map(async (parent) => {
        // Get all bookings in the series
        const allBookings = await prisma.booking.findMany({
          where: {
            OR: [
              { id: parent.id },
              { recurrenceParentId: parent.id },
            ],
          },
          select: {
            id: true,
            scheduledDate: true,
            status: true,
            isPaid: true,
            isPaused: true,
            finalPrice: true,
          },
          orderBy: { scheduledDate: 'asc' },
        });

        const now = new Date();
        const upcoming = allBookings.filter(
          (b) => new Date(b.scheduledDate) > now && b.status === 'PENDING'
        );
        const completed = allBookings.filter((b) => b.status === 'COMPLETED');
        const cancelled = allBookings.filter((b) => b.status === 'CANCELLED');
        const isPaused = allBookings.some((b) => b.isPaused);

        // Determine series status
        let seriesStatus: string;
        if (cancelled.length === allBookings.length) {
          seriesStatus = 'CANCELLED';
        } else if (upcoming.length === 0 && completed.length > 0) {
          seriesStatus = 'COMPLETED';
        } else if (isPaused) {
          seriesStatus = 'PAUSED';
        } else {
          seriesStatus = 'ACTIVE';
        }

        // Apply status filter
        if (status && seriesStatus.toLowerCase() !== status.toLowerCase()) {
          return null;
        }

        const totalRevenue = allBookings.reduce((sum, b) => sum + b.finalPrice, 0);
        const paidRevenue = allBookings
          .filter((b) => b.isPaid)
          .reduce((sum, b) => sum + b.finalPrice, 0);

        return {
          id: parent.id,
          bookingNumber: parent.bookingNumber,
          client: parent.client,
          address: parent.address,
          assignedCleaner: parent.assignedCleaner
            ? {
                id: parent.assignedCleanerId,
                name: `${parent.assignedCleaner.user.firstName || ''} ${parent.assignedCleaner.user.lastName || ''}`.trim(),
              }
            : null,
          serviceType: parent.serviceType,
          duration: parent.duration,
          basePrice: parent.basePrice,
          finalPrice: parent.finalPrice,
          recurrence: {
            frequency: parent.recurrenceFrequency,
            startDate: parent.scheduledDate,
            endDate: parent.recurrenceEndDate,
          },
          stats: {
            totalBookings: allBookings.length,
            completedBookings: completed.length,
            upcomingBookings: upcoming.length,
            cancelledBookings: cancelled.length,
            totalRevenue,
            paidRevenue,
            unpaidRevenue: totalRevenue - paidRevenue,
          },
          status: seriesStatus,
          isPaused,
          nextBookingDate: upcoming.length > 0 ? upcoming[0].scheduledDate : null,
          createdAt: parent.createdAt,
        };
      })
    );

    // Filter out nulls (from status filter)
    const filteredSeries = enrichedSeries.filter(Boolean);

    return NextResponse.json({
      success: true,
      data: filteredSeries,
      summary: {
        total: filteredSeries.length,
        active: filteredSeries.filter((s) => s?.status === 'ACTIVE').length,
        paused: filteredSeries.filter((s) => s?.status === 'PAUSED').length,
        completed: filteredSeries.filter((s) => s?.status === 'COMPLETED').length,
        cancelled: filteredSeries.filter((s) => s?.status === 'CANCELLED').length,
      },
    });
  } catch (error) {
    console.error('GET /api/bookings/recurring error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recurring series' },
      { status: 500 }
    );
  }
}
