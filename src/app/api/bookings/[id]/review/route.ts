import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET - Fetch reviews for a booking
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = session.user as any;

    // Fetch booking to verify access - use findFirst for multi-tenant check
    const booking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Fetch reviews for this booking
    const reviews = await prisma.cleaningReview.findMany({
      where: {
        bookingId: params.id,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    console.error('Get review error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST - Create a new review
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = session.user as any;

    // Only cleaners and office staff can create reviews
    if (!['OWNER', 'ADMIN', 'CLEANER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      houseConditionRating,
      customerRating,
      tipRating,
      overallRating,
      notes,
    } = body;

    // Validate ratings
    if (!overallRating || overallRating < 1 || overallRating > 5) {
      return NextResponse.json(
        { success: false, error: 'Overall rating is required (1-5)' },
        { status: 400 }
      );
    }

    // Fetch booking to verify it exists and is completed - use findFirst for multi-tenant check
    const booking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.status !== 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Can only review completed cleanings' },
        { status: 400 }
      );
    }

    // Create review
    const review = await prisma.cleaningReview.create({
      data: {
        companyId: user.companyId,
        bookingId: params.id,
        reviewerId: user.id,
        houseConditionRating,
        customerRating,
        tipRating,
        overallRating,
        notes,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create review' },
      { status: 500 }
    );
  }
}
