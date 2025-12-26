import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendSMS, fillTemplate, twilioPhoneNumber } from '@/lib/twilio';
import { sendMessageSchema } from '@/lib/validations';
import { normalizePhoneNumber } from '@/lib/utils';

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

    // Get booking details if provided
    let booking;
    if (validatedData.bookingId) {
      booking = await prisma.booking.findFirst({
        where: {
          id: validatedData.bookingId,
          userId: session.user.id,
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

    // Send SMS via Twilio
    const result = await sendSMS(normalizedPhone, validatedData.body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send SMS' },
        { status: 500 }
      );
    }

    // Log message in database
    const message = await prisma.message.create({
      data: {
        userId: session.user.id,
        bookingId: validatedData.bookingId,
        to: normalizedPhone,
        from: twilioPhoneNumber!,
        body: validatedData.body,
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
