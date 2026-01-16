import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateRecurringDates } from '@/lib/utils';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/subscriptions/[id]/resume - Resume a paused subscription
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only admins/owners can resume subscriptions
    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get the subscription (parent booking)
    const subscription = await prisma.booking.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
        isRecurring: true,
        recurrenceParentId: null,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Check if subscription is actually paused
    if (!subscription.internalNotes?.includes('[PAUSED]')) {
      return NextResponse.json(
        { success: false, error: 'Subscription is not paused' },
        { status: 400 }
      );
    }

    // Remove the paused flag
    const originalNotes = subscription.internalNotes.replace(/\[PAUSED\].*?Original notes: /, '');
    await prisma.booking.update({
      where: { id: subscription.id },
      data: {
        internalNotes: `[RESUMED] Subscription resumed on ${new Date().toISOString()}. ${originalNotes}`,
      },
    });

    // Generate new future bookings from now until end date
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + 1); // Start from tomorrow

    // Use the original end date or generate for next 12 months
    const endDate = subscription.recurrenceEndDate
      ? new Date(subscription.recurrenceEndDate)
      : new Date(now.setFullYear(now.getFullYear() + 1));

    // Only generate if we haven't reached the end date
    if (endDate > startDate) {
      const recurringDates = generateRecurringDates(
        startDate,
        subscription.recurrenceFrequency as 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY',
        endDate,
        52 // Max 52 occurrences
      );

      // Create new bookings for the future dates
      const newBookings = await Promise.all(
        recurringDates.map((date) =>
          prisma.booking.create({
            data: {
              companyId: user.companyId,
              userId: session.user.id,
              clientId: subscription.clientId,
              addressId: subscription.addressId,
              scheduledDate: date,
              duration: subscription.duration,
              serviceType: subscription.serviceType,
              price: subscription.price,
              notes: subscription.notes,
              internalNotes: 'Generated after subscription resume',
              isRecurring: true,
              recurrenceFrequency: subscription.recurrenceFrequency,
              recurrenceParentId: subscription.id,
              assignedTo: subscription.assignedTo,
              hasInsuranceCoverage: subscription.hasInsuranceCoverage,
              insuranceAmount: subscription.insuranceAmount,
              copayAmount: subscription.copayAmount,
              copayDiscountApplied: subscription.copayDiscountApplied,
              finalCopayAmount: subscription.finalCopayAmount,
            },
          })
        )
      );

      return NextResponse.json({
        success: true,
        message: `Subscription resumed. ${newBookings.length} future bookings created.`,
        createdBookings: newBookings.length,
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'Subscription resumed but end date has passed. No new bookings created.',
        createdBookings: 0,
      });
    }
  } catch (error) {
    console.error('POST /api/subscriptions/[id]/resume error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resume subscription' },
      { status: 500 }
    );
  }
}
