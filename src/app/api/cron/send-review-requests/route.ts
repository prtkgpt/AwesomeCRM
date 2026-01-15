import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendReviewRequest } from '@/lib/notifications';

/**
 * Cron job to send review requests to satisfied customers
 * Runs every 4 hours to check for recently completed bookings with high ratings
 *
 * Criteria:
 * - Booking completed 48-72 hours ago
 * - Customer rating is 4 or 5 stars
 * - Review request not already sent
 * - Feedback has been submitted
 *
 * Schedule: 0 */4 * * * (every 4 hours)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('⭐ Starting review request cron job...');

    const now = new Date();

    // Calculate time window: 48-72 hours ago
    const minTime = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours ago
    const maxTime = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago

    // Find bookings that meet criteria
    const eligibleBookings = await prisma.booking.findMany({
      where: {
        // Completed in the 48-72 hour window
        feedbackSubmittedAt: {
          gte: minTime,
          lte: maxTime,
        },
        // High rating (4-5 stars)
        customerRating: {
          gte: 4,
        },
        // Review request not yet sent
        reviewRequestSentAt: null,
        // Ensure status is completed
        status: {
          in: ['COMPLETED', 'CLEANER_COMPLETED'],
        },
      },
      include: {
        client: true,
        company: true,
      },
    });

    console.log(`📋 Found ${eligibleBookings.length} bookings eligible for review requests`);

    // Send review requests
    const results = await Promise.allSettled(
      eligibleBookings.map((booking) => sendReviewRequest(booking.id))
    );

    // Count results
    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    // Log failures for debugging
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `Failed to send review request for booking ${eligibleBookings[index].id}:`,
          result.reason
        );
      }
    });

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      reviewRequests: {
        total: eligibleBookings.length,
        successful,
        failed,
      },
      timeWindow: {
        from: minTime.toISOString(),
        to: maxTime.toISOString(),
      },
    };

    console.log('✅ Review request cron job completed:', summary);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('❌ Review request cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
