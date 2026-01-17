import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Validation schema for booking updates by client
const clientBookingUpdateSchema = z.object({
  // Reschedule request
  requestedDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .optional(),
  preferredTimeSlot: z.enum(['MORNING', 'AFTERNOON', 'EVENING']).optional(),
  rescheduleReason: z.string().optional(),
  // Notes
  customerNotes: z.string().optional(),
});

/**
 * GET /api/client/bookings/[id] - Get single booking details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only clients can access this endpoint
    if (user.role !== 'CLIENT') {
      return NextResponse.json(
        { error: 'Forbidden - This endpoint is only for clients' },
        { status: 403 }
      );
    }

    // Find the client record linked to this user
    const client = await prisma.client.findFirst({
      where: {
        userId: user.id,
        companyId: user.companyId,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client profile not found' },
        { status: 404 }
      );
    }

    // Get the booking - ensure it belongs to this client
    const booking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        clientId: client.id,
        companyId: user.companyId,
      },
      include: {
        address: true,
        service: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
            includedTasks: true,
          },
        },
        assignedCleaner: {
          select: {
            id: true,
            averageRating: true,
            totalJobsCompleted: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        reviews: {
          where: {
            clientId: client.id,
          },
          select: {
            id: true,
            overallRating: true,
            qualityRating: true,
            punctualityRating: true,
            communicationRating: true,
            valueRating: true,
            comment: true,
            createdAt: true,
          },
        },
        checklist: {
          select: {
            totalTasks: true,
            completedTasks: true,
            completedAt: true,
          },
        },
        photos: {
          where: {
            type: { in: ['BEFORE', 'AFTER'] },
          },
          select: {
            id: true,
            type: true,
            area: true,
            url: true,
            caption: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            amountPaid: true,
            amountDue: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Get company settings for cancellation policy
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        cancellationWindow: true,
        cancellationFeePercent: true,
      },
    });

    // Calculate if booking can be cancelled (within cancellation window)
    const now = new Date();
    const scheduledDate = new Date(booking.scheduledDate);
    const cancellationWindowMs = (company?.cancellationWindow || 24) * 60 * 60 * 1000;
    const canCancel =
      scheduledDate.getTime() - now.getTime() > cancellationWindowMs &&
      ['PENDING', 'CONFIRMED'].includes(booking.status);

    // Calculate if booking can be rescheduled
    const canReschedule =
      scheduledDate.getTime() - now.getTime() > cancellationWindowMs &&
      ['PENDING', 'CONFIRMED'].includes(booking.status);

    return NextResponse.json({
      success: true,
      data: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        scheduledDate: booking.scheduledDate,
        scheduledEndDate: booking.scheduledEndDate,
        duration: booking.duration,
        timeSlot: booking.timeSlot,
        serviceType: booking.serviceType,
        service: booking.service,
        status: booking.status,
        address: booking.address,
        // Pricing
        basePrice: booking.basePrice,
        addons: booking.addons,
        subtotal: booking.subtotal,
        discountAmount: booking.discountAmount,
        discountCode: booking.discountCode,
        taxAmount: booking.taxAmount,
        creditsApplied: booking.creditsApplied,
        tipAmount: booking.tipAmount,
        finalPrice: booking.finalPrice,
        // Payment
        isPaid: booking.isPaid,
        paymentStatus: booking.paymentStatus,
        paymentMethod: booking.paymentMethod,
        // Cleaner info (limited)
        cleaner: booking.assignedCleaner
          ? {
              id: booking.assignedCleaner.id,
              firstName: booking.assignedCleaner.user.firstName,
              lastName: booking.assignedCleaner.user.lastName,
              avatar: booking.assignedCleaner.user.avatar,
              averageRating: booking.assignedCleaner.averageRating,
              totalJobsCompleted: booking.assignedCleaner.totalJobsCompleted,
            }
          : null,
        // Progress
        onMyWayAt: booking.onMyWayAt,
        arrivedAt: booking.arrivedAt,
        completedAt: booking.completedAt,
        checklist: booking.checklist,
        photos: booking.photos,
        // Notes
        customerNotes: booking.customerNotes,
        // Recurrence
        isRecurring: booking.isRecurring,
        recurrenceFrequency: booking.recurrenceFrequency,
        isPaused: booking.isPaused,
        // Review
        review: booking.reviews[0] || null,
        hasReview: booking.reviews.length > 0,
        // Invoice
        invoice: booking.invoice,
        // Actions
        canCancel,
        canReschedule,
        cancellationPolicy: {
          windowHours: company?.cancellationWindow || 24,
          feePercent: company?.cancellationFeePercent || 50,
        },
        // Timestamps
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      },
    });
  } catch (error) {
    console.error('GET /api/client/bookings/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch booking details' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/client/bookings/[id] - Update booking (reschedule request, add notes)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only clients can access this endpoint
    if (user.role !== 'CLIENT') {
      return NextResponse.json(
        { error: 'Forbidden - This endpoint is only for clients' },
        { status: 403 }
      );
    }

    // Find the client record linked to this user
    const client = await prisma.client.findFirst({
      where: {
        userId: user.id,
        companyId: user.companyId,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client profile not found' },
        { status: 404 }
      );
    }

    // Get the booking - ensure it belongs to this client
    const booking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        clientId: client.id,
        companyId: user.companyId,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = clientBookingUpdateSchema.parse(body);

    // Get company settings
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        cancellationWindow: true,
        minimumLeadTime: true,
        maximumLeadTime: true,
      },
    });

    // Prepare update data
    const updateData: any = {};

    // Handle reschedule request
    if (validatedData.requestedDate) {
      const now = new Date();
      const scheduledDate = new Date(booking.scheduledDate);
      const cancellationWindowMs =
        (company?.cancellationWindow || 24) * 60 * 60 * 1000;

      // Check if booking can be rescheduled
      if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
        return NextResponse.json(
          { error: 'This booking cannot be rescheduled in its current status' },
          { status: 400 }
        );
      }

      if (scheduledDate.getTime() - now.getTime() < cancellationWindowMs) {
        return NextResponse.json(
          {
            error: `Bookings must be rescheduled at least ${company?.cancellationWindow || 24} hours before the scheduled time`,
          },
          { status: 400 }
        );
      }

      // Validate new date
      const newDate = new Date(validatedData.requestedDate);
      const minimumLeadHours = company?.minimumLeadTime || 2;
      const minimumDate = new Date(
        now.getTime() + minimumLeadHours * 60 * 60 * 1000
      );
      const maximumLeadDays = company?.maximumLeadTime || 60;
      const maximumDate = new Date(
        now.getTime() + maximumLeadDays * 24 * 60 * 60 * 1000
      );

      if (newDate < minimumDate) {
        return NextResponse.json(
          {
            error: `New date must be at least ${minimumLeadHours} hours from now`,
          },
          { status: 400 }
        );
      }

      if (newDate > maximumDate) {
        return NextResponse.json(
          {
            error: `New date cannot be more than ${maximumLeadDays} days from now`,
          },
          { status: 400 }
        );
      }

      // Update scheduled date
      updateData.scheduledDate = newDate;
      updateData.scheduledEndDate = new Date(
        newDate.getTime() + booking.duration * 60 * 1000
      );
      updateData.status = 'RESCHEDULED';

      // Store reschedule history
      const statusHistory = (booking.statusHistory as any[]) || [];
      statusHistory.push({
        status: 'RESCHEDULED',
        timestamp: new Date().toISOString(),
        userId: user.id,
        previousDate: booking.scheduledDate,
        newDate: newDate,
        reason: validatedData.rescheduleReason,
      });
      updateData.statusHistory = statusHistory;
    }

    // Handle time slot preference
    if (validatedData.preferredTimeSlot) {
      updateData.timeSlot = validatedData.preferredTimeSlot;
    }

    // Handle customer notes update
    if (validatedData.customerNotes !== undefined) {
      updateData.customerNotes = validatedData.customerNotes;
    }

    // Update the booking
    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: updateData,
      include: {
        address: true,
        service: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedBooking.id,
        bookingNumber: updatedBooking.bookingNumber,
        scheduledDate: updatedBooking.scheduledDate,
        duration: updatedBooking.duration,
        timeSlot: updatedBooking.timeSlot,
        status: updatedBooking.status,
        customerNotes: updatedBooking.customerNotes,
        service: updatedBooking.service,
        address: updatedBooking.address,
      },
      message: validatedData.requestedDate
        ? 'Booking rescheduled successfully'
        : 'Booking updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/client/bookings/[id] error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/client/bookings/[id] - Cancel booking
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only clients can access this endpoint
    if (user.role !== 'CLIENT') {
      return NextResponse.json(
        { error: 'Forbidden - This endpoint is only for clients' },
        { status: 403 }
      );
    }

    // Find the client record linked to this user
    const client = await prisma.client.findFirst({
      where: {
        userId: user.id,
        companyId: user.companyId,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client profile not found' },
        { status: 404 }
      );
    }

    // Get the booking - ensure it belongs to this client
    const booking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        clientId: client.id,
        companyId: user.companyId,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if booking can be cancelled
    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      return NextResponse.json(
        { error: 'This booking cannot be cancelled in its current status' },
        { status: 400 }
      );
    }

    // Get company settings for cancellation policy
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        cancellationWindow: true,
        cancellationFeePercent: true,
      },
    });

    const now = new Date();
    const scheduledDate = new Date(booking.scheduledDate);
    const cancellationWindowMs =
      (company?.cancellationWindow || 24) * 60 * 60 * 1000;
    const hoursUntilBooking =
      (scheduledDate.getTime() - now.getTime()) / (60 * 60 * 1000);

    // Calculate cancellation fee if within window
    let cancellationFee = 0;
    if (scheduledDate.getTime() - now.getTime() < cancellationWindowMs) {
      cancellationFee =
        (booking.finalPrice * (company?.cancellationFeePercent || 50)) / 100;
    }

    // Get cancellation reason from query params
    const { searchParams } = new URL(request.url);
    const cancellationReason = searchParams.get('reason') || 'Cancelled by client';

    // Update booking status
    const statusHistory = (booking.statusHistory as any[]) || [];
    statusHistory.push({
      status: 'CANCELLED',
      timestamp: new Date().toISOString(),
      userId: user.id,
      reason: cancellationReason,
    });

    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledById: user.id,
        cancellationReason,
        cancellationFee,
        statusHistory,
      },
    });

    // Refund credits if any were applied (minus cancellation fee)
    if (booking.creditsApplied > 0 && cancellationFee === 0) {
      await prisma.$transaction([
        prisma.client.update({
          where: { id: client.id },
          data: {
            creditBalance: { increment: booking.creditsApplied },
          },
        }),
        prisma.creditTransaction.create({
          data: {
            clientId: client.id,
            type: 'COMPENSATION',
            amount: booking.creditsApplied,
            balance: client.creditBalance + booking.creditsApplied,
            description: `Refund for cancelled booking ${booking.bookingNumber}`,
            referenceType: 'BOOKING',
            referenceId: booking.id,
            status: 'ACTIVE',
          },
        }),
      ]);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedBooking.id,
        bookingNumber: updatedBooking.bookingNumber,
        status: updatedBooking.status,
        cancelledAt: updatedBooking.cancelledAt,
        cancellationFee,
        creditsRefunded: cancellationFee === 0 ? booking.creditsApplied : 0,
      },
      message:
        cancellationFee > 0
          ? `Booking cancelled. A cancellation fee of $${cancellationFee.toFixed(2)} applies due to late cancellation (less than ${company?.cancellationWindow || 24} hours notice).`
          : 'Booking cancelled successfully.',
    });
  } catch (error) {
    console.error('DELETE /api/client/bookings/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}
