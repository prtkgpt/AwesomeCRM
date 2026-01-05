import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/feedback/[token] - Get booking details by feedback token
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { feedbackToken: params.token },
      include: {
        client: true,
        company: {
          select: {
            name: true,
            googleReviewUrl: true,
            zelleEmail: true,
            venmoUsername: true,
            cashappUsername: true,
          },
        },
        assignee: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
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
    console.error('GET /api/feedback/[token] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

// POST /api/feedback/[token] - Submit customer feedback and tip
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await request.json();
    const { rating, feedback, tipAmount } = body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Find booking by feedback token
    const booking = await prisma.booking.findUnique({
      where: { feedbackToken: params.token },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if feedback already submitted
    if (booking.feedbackSubmittedAt) {
      return NextResponse.json(
        { success: false, error: 'Feedback already submitted' },
        { status: 400 }
      );
    }

    // Update booking with feedback
    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        customerRating: rating,
        customerFeedback: feedback || null,
        tipAmount: tipAmount || null,
        feedbackSubmittedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedBooking,
      message: 'Thank you for your feedback!',
    });
  } catch (error) {
    console.error('POST /api/feedback/[token] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
