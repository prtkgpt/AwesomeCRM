// ============================================
// CleanDayCRM - Single Booking API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateBookingSchema } from '@/lib/validations';
import { sendSMS } from '@/lib/twilio';
import { sendEmail } from '@/lib/email';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/bookings/[id] - Get full booking details with all relations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build where clause based on role
    let whereClause: any;

    if (user.role === 'CLEANER') {
      const teamMember = await prisma.teamMember.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!teamMember) {
        return NextResponse.json(
          { success: false, error: 'Team member profile not found' },
          { status: 404 }
        );
      }

      whereClause = {
        AND: [
          { id },
          { companyId: user.companyId },
          {
            OR: [
              { assignedCleanerId: teamMember.id },
              { assignedCleanerId: null },
            ],
          },
        ],
      };
    } else if (user.role === 'CLIENT') {
      const client = await prisma.client.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!client) {
        return NextResponse.json(
          { success: false, error: 'Client profile not found' },
          { status: 404 }
        );
      }

      whereClause = {
        id,
        companyId: user.companyId,
        clientId: client.id,
      };
    } else {
      whereClause = {
        id,
        companyId: user.companyId,
      };
    }

    // Fetch booking with all relations
    const booking = await prisma.booking.findFirst({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            alternatePhone: true,
            preferredContactMethod: true,
            isVip: true,
            loyaltyTier: true,
            loyaltyPoints: true,
            creditBalance: true,
            stripeCustomerId: true,
            autoChargeEnabled: true,
            hasInsurance: true,
            insuranceProvider: true,
            notes: true,
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
            lat: true,
            lng: true,
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
        assignedCleaner: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                avatar: true,
              },
            },
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            basePrice: true,
            baseDuration: true,
            includedTasks: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        completedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        timeEntries: {
          orderBy: { clockIn: 'desc' },
          take: 10,
        },
        checklist: true,
        photos: {
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          include: {
            client: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
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
        payments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            transactionId: true,
            createdAt: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            type: true,
            channel: true,
            to: true,
            subject: true,
            body: true,
            status: true,
            sentAt: true,
            deliveredAt: true,
          },
        },
        qualityCheck: {
          select: {
            id: true,
            status: true,
            overallScore: true,
            completedAt: true,
            notes: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Get related recurring bookings if this is a recurring booking
    let recurringBookings = null;
    if (booking.isRecurring) {
      if (booking.recurrenceParentId) {
        // This is a child booking, get siblings
        recurringBookings = await prisma.booking.findMany({
          where: {
            OR: [
              { id: booking.recurrenceParentId },
              { recurrenceParentId: booking.recurrenceParentId },
            ],
            NOT: { id: booking.id },
          },
          select: {
            id: true,
            bookingNumber: true,
            scheduledDate: true,
            status: true,
            isPaid: true,
          },
          orderBy: { scheduledDate: 'asc' },
          take: 10,
        });
      } else {
        // This is a parent booking, get children
        recurringBookings = await prisma.booking.findMany({
          where: { recurrenceParentId: booking.id },
          select: {
            id: true,
            bookingNumber: true,
            scheduledDate: true,
            status: true,
            isPaid: true,
          },
          orderBy: { scheduledDate: 'asc' },
          take: 10,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...booking,
        recurringBookings,
      },
    });
  } catch (error) {
    console.error('GET /api/bookings/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

// PUT /api/bookings/[id] - Update booking (reschedule, change cleaner, update status, add notes)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateBookingSchema.parse(body);

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true, firstName: true, lastName: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Cleaners cannot update bookings through this endpoint
    if (user.role === 'CLEANER') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Use cleaner-specific actions' },
        { status: 403 }
      );
    }

    // Get existing booking
    const existingBooking = await prisma.booking.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        client: true,
        address: true,
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if cleaner assignment has changed
    const assignmentChanged =
      validatedData.assignedCleanerId !== undefined &&
      existingBooking.assignedCleanerId !== validatedData.assignedCleanerId;

    // Check if rescheduling
    const isRescheduling =
      validatedData.scheduledDate !== undefined &&
      new Date(validatedData.scheduledDate).getTime() !== existingBooking.scheduledDate.getTime();

    // Build status history entry if status is changing
    let statusHistory = existingBooking.statusHistory as any[] || [];
    if (validatedData.status && validatedData.status !== existingBooking.status) {
      statusHistory = [
        ...statusHistory,
        {
          status: validatedData.status,
          timestamp: new Date().toISOString(),
          userId: session.user.id,
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        },
      ];
    }

    // Calculate new end date if duration or scheduled date changes
    let scheduledEndDate = existingBooking.scheduledEndDate;
    if (validatedData.scheduledDate || validatedData.duration) {
      const startDate = validatedData.scheduledDate
        ? new Date(validatedData.scheduledDate)
        : existingBooking.scheduledDate;
      const duration = validatedData.duration || existingBooking.duration;
      scheduledEndDate = new Date(startDate);
      scheduledEndDate.setMinutes(scheduledEndDate.getMinutes() + duration);
    }

    // Prepare update data
    const updateData: any = {
      ...(validatedData.clientId && { clientId: validatedData.clientId }),
      ...(validatedData.addressId && { addressId: validatedData.addressId }),
      ...(validatedData.serviceId !== undefined && { serviceId: validatedData.serviceId }),
      ...(validatedData.serviceType && { serviceType: validatedData.serviceType }),
      ...(validatedData.scheduledDate && {
        scheduledDate: new Date(validatedData.scheduledDate),
        scheduledEndDate,
      }),
      ...(validatedData.duration && { duration: validatedData.duration }),
      ...(validatedData.timeSlot !== undefined && { timeSlot: validatedData.timeSlot }),
      ...(validatedData.status && { status: validatedData.status, statusHistory }),
      ...(validatedData.basePrice !== undefined && { basePrice: validatedData.basePrice }),
      ...(validatedData.discountAmount !== undefined && { discountAmount: validatedData.discountAmount }),
      ...(validatedData.tipAmount !== undefined && { tipAmount: validatedData.tipAmount }),
      ...(validatedData.isPaid !== undefined && { isPaid: validatedData.isPaid }),
      ...(validatedData.paymentMethod && { paymentMethod: validatedData.paymentMethod }),
      ...(validatedData.customerNotes !== undefined && { customerNotes: validatedData.customerNotes }),
      ...(validatedData.internalNotes !== undefined && { internalNotes: validatedData.internalNotes }),
      ...(validatedData.cleanerNotes !== undefined && { cleanerNotes: validatedData.cleanerNotes }),
      ...(validatedData.isRecurring !== undefined && { isRecurring: validatedData.isRecurring }),
      ...(validatedData.recurrenceFrequency && { recurrenceFrequency: validatedData.recurrenceFrequency }),
      ...(validatedData.isPaused !== undefined && { isPaused: validatedData.isPaused }),
      ...(validatedData.pausedUntil !== undefined && { pausedUntil: validatedData.pausedUntil }),
    };

    // Handle cleaner assignment
    if (validatedData.assignedCleanerId !== undefined) {
      updateData.assignedCleanerId = validatedData.assignedCleanerId;
      if (assignmentChanged) {
        updateData.assignmentMethod = 'MANUAL';
      }
    }

    // Recalculate final price if pricing fields changed
    if (validatedData.basePrice !== undefined || validatedData.discountAmount !== undefined || validatedData.tipAmount !== undefined) {
      const basePrice = validatedData.basePrice ?? existingBooking.basePrice;
      const discountAmount = validatedData.discountAmount ?? existingBooking.discountAmount;
      const tipAmount = validatedData.tipAmount ?? existingBooking.tipAmount;
      const taxAmount = existingBooking.taxAmount;
      const creditsApplied = existingBooking.creditsApplied;

      updateData.finalPrice = basePrice - discountAmount + taxAmount + tipAmount - creditsApplied;
    }

    // Update booking
    const booking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        address: true,
        assignedCleaner: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        service: true,
      },
    });

    // Send notification to newly assigned cleaner
    if (assignmentChanged && booking.assignedCleaner) {
      const company = await prisma.company.findUnique({
        where: { id: user.companyId },
        select: {
          name: true,
          twilioAccountSid: true,
          twilioAuthToken: true,
          twilioPhoneNumber: true,
          resendApiKey: true,
        },
      });

      const cleanerName = `${booking.assignedCleaner.user.firstName || ''} ${booking.assignedCleaner.user.lastName || ''}`.trim() || 'there';
      const cleanerEmail = booking.assignedCleaner.user.email;
      const cleanerPhone = booking.assignedCleaner.user.phone;

      const scheduledDate = new Date(booking.scheduledDate);
      const dateStr = scheduledDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      const timeStr = scheduledDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });

      const fullAddress = `${booking.address.street}, ${booking.address.city}, ${booking.address.state} ${booking.address.zip}`;
      const clientName = `${booking.client.firstName} ${booking.client.lastName || ''}`.trim();

      // Send SMS notification
      if (cleanerPhone && company?.twilioAccountSid) {
        try {
          const smsMessage = `Hi ${cleanerName}! You've been assigned a new cleaning job on ${dateStr} at ${timeStr}. Client: ${clientName}. Location: ${fullAddress}. Check your dashboard for details.`;

          await sendSMS(cleanerPhone, smsMessage, {
            accountSid: company.twilioAccountSid,
            authToken: company.twilioAuthToken || undefined,
            from: company.twilioPhoneNumber || undefined,
          });
          console.log('Cleaner assignment SMS sent to:', cleanerPhone);
        } catch (error) {
          console.error('Failed to send SMS to cleaner:', error);
        }
      }

      // Send email notification
      if (cleanerEmail && company?.resendApiKey) {
        try {
          await sendEmail({
            to: cleanerEmail,
            subject: `New Job Assignment - ${clientName} on ${dateStr}`,
            html: `
              <h2>New Job Assignment</h2>
              <p>Hi ${cleanerName},</p>
              <p>You've been assigned a new cleaning job:</p>
              <ul>
                <li><strong>Client:</strong> ${clientName}</li>
                <li><strong>Date:</strong> ${dateStr} at ${timeStr}</li>
                <li><strong>Service:</strong> ${booking.serviceType.replace('_', ' ')}</li>
                <li><strong>Duration:</strong> ${booking.duration} minutes</li>
                <li><strong>Address:</strong> ${fullAddress}</li>
              </ul>
              <p>Log in to your dashboard to view full details.</p>
              <p>Best regards,<br>${company.name}</p>
            `,
            type: 'notification',
            apiKey: company.resendApiKey,
          });
          console.log('Cleaner assignment email sent to:', cleanerEmail);
        } catch (error) {
          console.error('Failed to send email to cleaner:', error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: booking,
      message: isRescheduling
        ? 'Booking rescheduled successfully'
        : 'Booking updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/bookings/[id] error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

// DELETE /api/bookings/[id] - Cancel booking with optional cancellation fee
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const applyCancellationFee = searchParams.get('applyCancellationFee') === 'true';
    const reason = searchParams.get('reason') || 'Cancelled by admin';
    const hardDelete = searchParams.get('hardDelete') === 'true';

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Cleaners cannot delete/cancel bookings
    if (user.role === 'CLEANER') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Cleaners cannot cancel bookings' },
        { status: 403 }
      );
    }

    // Get existing booking
    const existingBooking = await prisma.booking.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        client: true,
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Get company settings for cancellation fee
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        cancellationFeePercent: true,
        cancellationWindow: true,
      },
    });

    // Calculate cancellation fee if applicable
    let cancellationFee: number | null = null;
    if (applyCancellationFee && company?.cancellationFeePercent) {
      const hoursUntilBooking =
        (existingBooking.scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60);

      // Apply fee if within cancellation window
      if (hoursUntilBooking <= (company.cancellationWindow || 24)) {
        cancellationFee =
          existingBooking.finalPrice * (company.cancellationFeePercent / 100);
      }
    }

    // Hard delete only if explicitly requested and booking is in PENDING status
    if (hardDelete && existingBooking.status === 'PENDING') {
      await prisma.booking.delete({
        where: { id },
      });

      return NextResponse.json({
        success: true,
        message: 'Booking deleted successfully',
      });
    }

    // Soft cancel - update status to CANCELLED
    const statusHistory = (existingBooking.statusHistory as any[]) || [];
    statusHistory.push({
      status: 'CANCELLED',
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      reason,
    });

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        statusHistory,
        cancelledAt: new Date(),
        cancelledById: session.user.id,
        cancellationReason: reason,
        cancellationFee,
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
                email: true,
              },
            },
          },
        },
      },
    });

    // Notify cleaner if assigned
    if (booking.assignedCleaner) {
      const cleanerEmail = booking.assignedCleaner.user.email;
      if (cleanerEmail) {
        const companyWithApi = await prisma.company.findUnique({
          where: { id: user.companyId },
          select: { name: true, resendApiKey: true },
        });

        if (companyWithApi?.resendApiKey) {
          const scheduledDate = new Date(booking.scheduledDate);
          const dateStr = scheduledDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          });

          try {
            await sendEmail({
              to: cleanerEmail,
              subject: `Job Cancelled - ${dateStr}`,
              html: `
                <h2>Job Cancelled</h2>
                <p>The following job has been cancelled:</p>
                <ul>
                  <li><strong>Client:</strong> ${booking.client.firstName} ${booking.client.lastName || ''}</li>
                  <li><strong>Date:</strong> ${dateStr}</li>
                  <li><strong>Address:</strong> ${booking.address.street}, ${booking.address.city}</li>
                  <li><strong>Reason:</strong> ${reason}</li>
                </ul>
                <p>Please check your dashboard for your updated schedule.</p>
                <p>Best regards,<br>${companyWithApi.name}</p>
              `,
              type: 'notification',
              apiKey: companyWithApi.resendApiKey,
            });
          } catch (error) {
            console.error('Failed to send cancellation email to cleaner:', error);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: booking,
      cancellationFee,
      message: cancellationFee
        ? `Booking cancelled with $${cancellationFee.toFixed(2)} cancellation fee`
        : 'Booking cancelled successfully',
    });
  } catch (error) {
    console.error('DELETE /api/bookings/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}

// PATCH /api/bookings/[id] - Partial update (for specific fields)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build where clause based on role
    let whereClause: any;

    if (user.role === 'CLEANER') {
      const teamMember = await prisma.teamMember.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!teamMember) {
        return NextResponse.json(
          { success: false, error: 'Team member profile not found' },
          { status: 404 }
        );
      }

      whereClause = {
        AND: [
          { id },
          { companyId: user.companyId },
          {
            OR: [
              { assignedCleanerId: teamMember.id },
              { assignedCleanerId: null },
            ],
          },
        ],
      };
    } else {
      whereClause = {
        id,
        companyId: user.companyId,
      };
    }

    // Verify ownership
    const existingBooking = await prisma.booking.findFirst({
      where: whereClause,
    });

    if (!existingBooking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Define allowed fields based on role
    const cleanerAllowedFields = ['cleanerNotes'];
    const adminAllowedFields = [
      'customerNotes',
      'internalNotes',
      'cleanerNotes',
      'status',
      'isPaid',
      'paymentMethod',
      'tipAmount',
    ];

    const allowedFields =
      user.role === 'CLEANER' ? cleanerAllowedFields : adminAllowedFields;

    // Filter body to only allowed fields
    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle status changes with history
    if (updateData.status && updateData.status !== existingBooking.status) {
      const statusHistory = (existingBooking.statusHistory as any[]) || [];
      statusHistory.push({
        status: updateData.status,
        timestamp: new Date().toISOString(),
        userId: session.user.id,
      });
      updateData.statusHistory = statusHistory;

      // Set completion fields if marking as completed
      if (updateData.status === 'COMPLETED' || updateData.status === 'CLEANER_COMPLETED') {
        updateData.completedAt = new Date();
        updateData.completedById = session.user.id;
      }
    }

    // Update booking
    const booking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
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
        assignedCleaner: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Booking updated successfully',
    });
  } catch (error) {
    console.error('PATCH /api/bookings/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}
