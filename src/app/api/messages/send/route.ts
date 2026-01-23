import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendSMS, fillTemplate, twilioPhoneNumber } from '@/lib/twilio';
import { sendMessageSchema } from '@/lib/validations';
import { normalizePhoneNumber } from '@/lib/utils';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/messages/send - Send SMS message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = sendMessageSchema.parse(body);

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(validatedData.to);

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get company details for template filling
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { name: true, twilioPhoneNumber: true, twilioAccountSid: true, twilioAuthToken: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Get booking details if provided
    let booking;
    if (validatedData.bookingId) {
      booking = await prisma.booking.findFirst({
        where: {
          id: validatedData.bookingId,
          companyId: user.companyId,
        },
        include: {
          client: true,
          address: true,
        },
      });

      if (!booking) {
        return NextResponse.json(
          { success: false, error: 'Booking not found' },
          { status: 404 }
        );
      }
    }

    // Get client details if recipientId is provided (for template filling)
    let clientName = '';
    if (validatedData.recipientId) {
      const client = await prisma.client.findFirst({
        where: {
          id: validatedData.recipientId,
          companyId: user.companyId,
        },
        select: { name: true },
      });
      if (client) {
        clientName = client.name.split(' ')[0]; // First name
      }
    } else if (booking?.client) {
      clientName = booking.client.name.split(' ')[0]; // First name from booking
    }

    // Fill template placeholders with actual values
    const templateVariables: Record<string, string> = {
      clientName: clientName || 'Valued Customer',
      businessName: company.name,
      companyName: company.name,
      senderName: user.name || 'Your cleaning team',
    };

    // Add booking-related variables if available
    if (booking) {
      templateVariables.date = new Date(booking.scheduledDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      templateVariables.time = new Date(booking.scheduledDate).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      if (booking.address) {
        templateVariables.address = `${booking.address.street}, ${booking.address.city}`;
      }
      templateVariables.price = booking.price.toFixed(2);
    }

    // Fill template with variables
    const filledBody = fillTemplate(validatedData.body, templateVariables);

    // Send SMS via Twilio (use company credentials if available)
    const result = await sendSMS(normalizedPhone, filledBody, {
      accountSid: company.twilioAccountSid || undefined,
      authToken: company.twilioAuthToken || undefined,
      from: company.twilioPhoneNumber || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send SMS' },
        { status: 500 }
      );
    }

    // Log message in database (store the filled body, not the template)
    const message = await prisma.message.create({
      data: {
        companyId: user.companyId,
        userId: session.user.id,
        bookingId: validatedData.bookingId,
        to: normalizedPhone,
        from: company.twilioPhoneNumber || twilioPhoneNumber!,
        body: filledBody,
        type: validatedData.type,
        status: 'SENT',
        twilioSid: result.sid,
      },
    });

    return NextResponse.json({
      success: true,
      data: message,
      message: 'SMS sent successfully',
    });
  } catch (error) {
    console.error('POST /api/messages/send error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
