import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateBookingSchema } from '@/lib/validations';
import { sendSMS } from '@/lib/twilio';
import { sendEmail } from '@/lib/email';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/bookings/[id] - Get booking details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

      // For cleaners: use AND to properly combine conditions with OR
      whereClause = {
        AND: [
          { id: params.id },
          { companyId: user.companyId },
          {
            OR: [
              { assignedTo: teamMember.id },
              { assignedTo: null },
            ],
          },
        ],
      };
    } else {
      // For admins/owners: standard query
      whereClause = {
        id: params.id,
        companyId: user.companyId,
      };
    }

    const booking = await prisma.booking.findFirst({
      where: whereClause,
      include: {
        client: true,
        address: true,
        assignee: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        completedByUser: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
        approvedByUser: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
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

    return NextResponse.json({ success: true, data: booking });
  } catch (error) {
    console.error('GET /api/bookings/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

// PUT /api/bookings/[id] - Update booking
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateBookingSchema.parse(body);

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Cleaners cannot use PUT endpoint to update bookings
    if (user.role === 'CLEANER') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Cleaners cannot update bookings' },
        { status: 403 }
      );
    }

    // Verify ownership
    const existingBooking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if cleaner assignment has changed
    const assignmentChanged = validatedData.assignedTo !== undefined &&
                              existingBooking.assignedTo !== validatedData.assignedTo;

    // Update booking
    const booking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        ...(validatedData.clientId && { clientId: validatedData.clientId }),
        ...(validatedData.addressId && { addressId: validatedData.addressId }),
        ...(validatedData.scheduledDate && { scheduledDate: validatedData.scheduledDate }),
        ...(validatedData.duration && { duration: validatedData.duration }),
        ...(validatedData.serviceType && { serviceType: validatedData.serviceType }),
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.price !== undefined && { price: validatedData.price }),
        ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
        ...(validatedData.internalNotes !== undefined && { internalNotes: validatedData.internalNotes }),
        ...(validatedData.isPaid !== undefined && { isPaid: validatedData.isPaid }),
        ...(validatedData.paymentMethod && { paymentMethod: validatedData.paymentMethod }),
        ...(validatedData.assignedTo !== undefined && { assignedTo: validatedData.assignedTo }),
      },
      include: {
        client: true,
        address: true,
        assignee: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    // Send notification to newly assigned cleaner
    if (assignmentChanged && booking.assignee) {
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

      const cleanerName = booking.assignee.user.name || 'there';
      const cleanerEmail = booking.assignee.user.email;
      const cleanerPhone = booking.assignee.user.phone;

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

      // Send SMS notification
      if (cleanerPhone && company) {
        try {
          const smsMessage = `Hi ${cleanerName}! You've been assigned a new cleaning job on ${dateStr} at ${timeStr}. Client: ${booking.client.name}. Location: ${fullAddress}. Check your dashboard for details.`;

          await sendSMS(cleanerPhone, smsMessage, {
            accountSid: company.twilioAccountSid || undefined,
            authToken: company.twilioAuthToken || undefined,
            from: company.twilioPhoneNumber || undefined,
          });
          console.log('✅ Cleaner assignment SMS sent to:', cleanerPhone);
        } catch (error) {
          console.error('❌ Failed to send SMS to cleaner:', error);
        }
      }

      // Send email notification
      if (cleanerEmail && company) {
        try {
          const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Job Assignment</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #2563eb; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">🧹 New Job Assignment</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px;">You have a new cleaning scheduled</p>
  </div>

  <div style="background-color: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${cleanerName},</p>

    <p style="font-size: 16px;">You've been assigned a new cleaning job. Here are the details:</p>

    <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h2 style="margin-top: 0; color: #2563eb; font-size: 20px;">Job Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Client:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${booking.client.name}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Date & Time:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${dateStr}<br>${timeStr}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Service Type:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${booking.serviceType.replace('_', ' ')}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Duration:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${booking.duration} minutes</td>
        </tr>
        <tr>
          <td style="padding: 10px 0;"><strong>Address:</strong></td>
          <td style="padding: 10px 0; text-align: right;">${fullAddress}</td>
        </tr>
      </table>
    </div>

    ${booking.address.gateCode ? `
    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #92400e;"><strong>🔑 Gate Code:</strong> ${booking.address.gateCode}</p>
    </div>
    ` : ''}

    ${booking.address.parkingInfo ? `
    <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
      <p style="margin: 0; color: #1e40af;"><strong>🅿️ Parking Info:</strong> ${booking.address.parkingInfo}</p>
    </div>
    ` : ''}

    ${booking.address.petInfo ? `
    <div style="background-color: #fce7f3; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ec4899;">
      <p style="margin: 0; color: #831843;"><strong>🐾 Pet Info:</strong> ${booking.address.petInfo}</p>
    </div>
    ` : ''}

    ${booking.notes ? `
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6b7280;">
      <p style="margin: 0; color: #374151;"><strong>📝 Notes:</strong> ${booking.notes}</p>
    </div>
    ` : ''}

    <p style="font-size: 14px; margin-top: 20px;">
      Log in to your dashboard to view full details and manage this job.
    </p>

    <p style="font-size: 14px; margin-top: 20px;">
      Best regards,<br>
      <strong>${company?.name || 'Your Company'}</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; font-size: 12px; color: #6b7280;">
    <p>© ${new Date().getFullYear()} ${company?.name || 'CleanDay CRM'}. All rights reserved.</p>
  </div>
</body>
</html>
          `;

          await sendEmail({
            to: cleanerEmail,
            subject: `New Job Assignment - ${booking.client.name} on ${dateStr}`,
            html: emailHtml,
            type: 'notification',
            apiKey: company.resendApiKey || undefined,
          });
          console.log('✅ Cleaner assignment email sent to:', cleanerEmail);
        } catch (error) {
          console.error('❌ Failed to send email to cleaner:', error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Booking updated successfully',
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

// DELETE /api/bookings/[id] - Delete booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Cleaners cannot delete bookings
    if (user.role === 'CLEANER') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Cleaners cannot delete bookings' },
        { status: 403 }
      );
    }

    // Verify ownership - use companyId for multi-tenant isolation
    const existingBooking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Delete booking
    await prisma.booking.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Booking deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/bookings/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete booking' },
      { status: 500 }
    );
  }
}

// PATCH /api/bookings/[id] - Partial update (for documentation fields)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

      // For cleaners: use AND to properly combine conditions with OR
      whereClause = {
        AND: [
          { id: params.id },
          { companyId: user.companyId },
          {
            OR: [
              { assignedTo: teamMember.id },
              { assignedTo: null },
            ],
          },
        ],
      };
    } else {
      // For admins/owners: standard query
      whereClause = {
        id: params.id,
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

    // Prepare update data
    const updateData: any = {
      ...(body.insuranceDocumentation !== undefined && { insuranceDocumentation: body.insuranceDocumentation }),
      ...(body.cleaningObservations !== undefined && { cleaningObservations: body.cleaningObservations }),
      ...(body.copayPaid !== undefined && { copayPaid: body.copayPaid }),
      ...(body.copayPaymentMethod !== undefined && { copayPaymentMethod: body.copayPaymentMethod }),
      ...(body.copayPaidAt !== undefined && { copayPaidAt: body.copayPaidAt }),
    };

    // Handle status updates
    if (body.status !== undefined) {
      updateData.status = body.status;

      // If marking as completed, track who completed it and when
      if (body.status === 'COMPLETED') {
        updateData.completedAt = new Date();
        updateData.completedBy = session.user.id;
      }
    }

    // Update booking with partial data
    const booking = await prisma.booking.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: true,
        address: true,
        assignee: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        completedByUser: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Documentation updated successfully',
    });
  } catch (error) {
    console.error('PATCH /api/bookings/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update documentation' },
      { status: 500 }
    );
  }
}
