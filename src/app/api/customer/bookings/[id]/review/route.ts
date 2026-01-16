import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST - Submit a customer review for a booking
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const bookingId = params.id;
    const body = await req.json();
    const { rating, feedback } = body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Get the booking and verify ownership
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        assignee: {
          include: {
            user: true
          }
        }
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify the booking belongs to a client owned by this user
    if (booking.client.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only review your own bookings' },
        { status: 403 }
      );
    }

    // Verify the booking is completed
    if (booking.status !== 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'You can only review completed services' },
        { status: 400 }
      );
    }

    // Check if already reviewed
    if (booking.customerRating) {
      return NextResponse.json(
        { success: false, error: 'You have already reviewed this service' },
        { status: 400 }
      );
    }

    // Update the booking with the review
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        customerRating: rating,
        customerFeedback: feedback || null,
        feedbackSubmittedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you for your review!',
      data: {
        rating: updatedBooking.customerRating,
        feedback: updatedBooking.customerFeedback,
      },
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}
