import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/payments/pre-auth-check - Check card validity 24 hours before cleaning
// This should be called by a cron job or scheduled task
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (you might want to use an API key for cron jobs)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json(
        { success: false, error: 'Payment processing is not configured' },
        { status: 503 }
      );
    }

    // Find bookings scheduled for 24 hours from now
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twentyFiveHoursFromNow = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const upcomingBookings = await prisma.booking.findMany({
      where: {
        scheduledDate: {
          gte: twentyFourHoursFromNow,
          lte: twentyFiveHoursFromNow,
        },
        status: 'SCHEDULED',
        isPaid: false,
        paymentPreAuthAt: null, // Not yet pre-authorized
      },
      include: {
        client: true,
        address: true,
      },
    });

    const results = [];

    for (const booking of upcomingBookings) {
      try {
        // Skip if client doesn't have auto-charge enabled
        if (!booking.client.autoChargeEnabled || !booking.client.stripePaymentMethodId) {
          results.push({
            bookingId: booking.id,
            status: 'skipped',
            reason: 'Auto-charge not enabled or no payment method',
          });
          continue;
        }

        // Check if customer and payment method exist
        if (!booking.client.stripeCustomerId) {
          results.push({
            bookingId: booking.id,
            status: 'error',
            reason: 'No Stripe customer ID',
          });
          continue;
        }

        // Create a $1 authorization to verify card
        const paymentIntent = await stripe.paymentIntents.create({
          amount: 100, // $1.00 in cents
          currency: 'usd',
          customer: booking.client.stripeCustomerId,
          payment_method: booking.client.stripePaymentMethodId,
          off_session: true,
          capture_method: 'manual', // Don't actually charge, just authorize
          confirm: true,
          description: `Pre-auth check for booking ${booking.id}`,
          metadata: {
            bookingId: booking.id,
            clientId: booking.client.id,
            isPreAuth: 'true',
          },
        });

        // If successful, cancel the authorization
        if (paymentIntent.status === 'requires_capture') {
          await stripe.paymentIntents.cancel(paymentIntent.id);

          // Update booking with pre-auth info
          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              paymentPreAuthAt: new Date(),
              paymentPreAuthAmount: booking.price,
            },
          });

          results.push({
            bookingId: booking.id,
            status: 'success',
            client: booking.client.name,
            amount: booking.price,
          });

          console.log(`✅ Pre-authorized card for ${booking.client.name} - Booking ${booking.id}`);
        } else {
          results.push({
            bookingId: booking.id,
            status: 'failed',
            reason: `Unexpected payment intent status: ${paymentIntent.status}`,
          });
        }
      } catch (error: any) {
        console.error(`🔴 Pre-auth failed for booking ${booking.id}:`, error.message);

        results.push({
          bookingId: booking.id,
          status: 'error',
          error: error.message,
          code: error.code,
        });

        // TODO: Notify admin about failed pre-auth
        // This could mean the card is expired, insufficient funds, etc.
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalChecked: upcomingBookings.length,
        results,
      },
    });
  } catch (error) {
    console.error('🔴 POST /api/payments/pre-auth-check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run pre-auth checks' },
      { status: 500 }
    );
  }
}
