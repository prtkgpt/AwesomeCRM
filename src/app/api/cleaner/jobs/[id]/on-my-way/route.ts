import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/cleaner/jobs/[id]/on-my-way - Mark as "On My Way" and send SMS to client
export async function POST(
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
      select: { id: true, role: true, companyId: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only cleaners can mark "On My Way"
    if (user.role !== 'CLEANER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the cleaner's team member record
    const teamMember = await prisma.teamMember.findUnique({
      where: { userId: user.id },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member profile not found' }, { status: 404 });
    }

    // Verify the booking is assigned to this cleaner
    const booking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        assignedTo: teamMember.id,
        companyId: user.companyId,
      },
      include: {
        client: {
          select: {
            name: true,
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

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found or not assigned to you' },
        { status: 404 }
      );
    }

    // Check if already marked "On My Way"
    if (booking.onMyWaySentAt) {
      return NextResponse.json(
        { error: 'Already marked as "On My Way" for this job' },
        { status: 400 }
      );
    }

    // Update booking with "On My Way" timestamp
    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        onMyWaySentAt: new Date(),
      },
    });

    console.log(`✅ Cleaner ${user.name} is on the way to job ${params.id} for ${booking.client.name}`);

    // Send SMS to client if they have a phone number
    let smsSent = false;
    let smsError = null;

    if (booking.client.phone && booking.company.twilioAccountSid && booking.company.twilioAuthToken && booking.company.twilioPhoneNumber) {
      try {
        const client = twilio(booking.company.twilioAccountSid, booking.company.twilioAuthToken);

        const message = `Hi ${booking.client.name.split(' ')[0]}! ${user.name} from ${booking.company.name} is on the way to ${booking.address.street}, ${booking.address.city}. We'll be there soon!`;

        const sms = await client.messages.create({
          body: message,
          from: booking.company.twilioPhoneNumber,
          to: booking.client.phone,
        });

        // Log the message in the database
        await prisma.message.create({
          data: {
            companyId: user.companyId!,
            userId: user.id,
            bookingId: booking.id,
            to: booking.client.phone,
            from: booking.company.twilioPhoneNumber,
            body: message,
            type: 'ON_MY_WAY',
            status: sms.status === 'queued' || sms.status === 'sent' ? 'SENT' : 'PENDING',
            twilioSid: sms.sid,
          },
        });

        smsSent = true;
        console.log(`📱 SMS sent to ${booking.client.phone} (SID: ${sms.sid})`);
      } catch (error) {
        console.error('🔴 Failed to send SMS:', error);
        smsError = error instanceof Error ? error.message : 'Failed to send SMS';
        // Don't fail the request if SMS fails - just log it
      }
    } else {
      console.log('⚠️ SMS not sent: Missing client phone or Twilio configuration');
    }

    return NextResponse.json({
      success: true,
      data: updatedBooking,
      smsSent,
      smsError,
      message: smsSent
        ? `Marked as "On My Way" and sent SMS to ${booking.client.name}`
        : `Marked as "On My Way" (SMS not sent: ${smsError || 'missing phone or Twilio config'})`,
    });
  } catch (error) {
    console.error('🔴 POST /api/cleaner/jobs/[id]/on-my-way error:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to mark as "On My Way"' },
      { status: 500 }
    );
  }
}
