import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Validation schema for review submission
const createReviewSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  overallRating: z.number().min(1).max(5),
  qualityRating: z.number().min(1).max(5).optional(),
  punctualityRating: z.number().min(1).max(5).optional(),
  communicationRating: z.number().min(1).max(5).optional(),
  valueRating: z.number().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
  comment: z.string().max(2000).optional(),
  isPublic: z.boolean().default(true),
});

/**
 * GET /api/client/reviews - List reviews submitted by the client
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only clients can access this endpoint
    if (user.role !== 'CLIENT') {
      return NextResponse.json(
        { error: 'Forbidden - This endpoint is only for clients' },
        { status: 403 }
      );
    }

    // Find the client record linked to this user
    const client = await prisma.client.findFirst({
      where: {
        userId: user.id,
        companyId: user.companyId,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client profile not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Get total count
    const totalCount = await prisma.review.count({
      where: { clientId: client.id },
    });

    // Calculate pagination
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch reviews
    const reviews = await prisma.review.findMany({
      where: { clientId: client.id },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            scheduledDate: true,
            serviceType: true,
            service: {
              select: {
                name: true,
              },
            },
            address: {
              select: {
                label: true,
                street: true,
                city: true,
              },
            },
          },
        },
        cleaner: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Get bookings pending review
    const bookingsPendingReview = await prisma.booking.findMany({
      where: {
        clientId: client.id,
        companyId: user.companyId,
        status: 'COMPLETED',
        reviews: {
          none: {
            clientId: client.id,
          },
        },
      },
      select: {
        id: true,
        bookingNumber: true,
        scheduledDate: true,
        completedAt: true,
        serviceType: true,
        service: {
          select: {
            name: true,
          },
        },
        address: {
          select: {
            label: true,
            street: true,
            city: true,
          },
        },
        assignedCleaner: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        reviews: reviews.map((review) => ({
          id: review.id,
          bookingId: review.bookingId,
          booking: {
            bookingNumber: review.booking.bookingNumber,
            scheduledDate: review.booking.scheduledDate,
            serviceType: review.booking.serviceType,
            serviceName: review.booking.service?.name,
            address: review.booking.address,
          },
          cleaner: review.cleaner
            ? {
                id: review.cleaner.id,
                firstName: review.cleaner.user.firstName,
                lastName: review.cleaner.user.lastName,
                avatar: review.cleaner.user.avatar,
              }
            : null,
          // Ratings
          overallRating: review.overallRating,
          qualityRating: review.qualityRating,
          punctualityRating: review.punctualityRating,
          communicationRating: review.communicationRating,
          valueRating: review.valueRating,
          // Content
          title: review.title,
          comment: review.comment,
          // Response from company
          responseText: review.responseText,
          respondedAt: review.respondedAt,
          // Status
          isPublic: review.isPublic,
          isVerified: review.isVerified,
          // Timestamps
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
        })),
        pendingReviews: bookingsPendingReview.map((booking) => ({
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          scheduledDate: booking.scheduledDate,
          completedAt: booking.completedAt,
          serviceType: booking.serviceType,
          serviceName: booking.service?.name,
          address: booking.address,
          cleaner: booking.assignedCleaner
            ? {
                id: booking.assignedCleaner.id,
                firstName: booking.assignedCleaner.user.firstName,
                lastName: booking.assignedCleaner.user.lastName,
              }
            : null,
        })),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasMore: page < totalPages,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/client/reviews error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/client/reviews - Submit a review for a completed booking
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only clients can access this endpoint
    if (user.role !== 'CLIENT') {
      return NextResponse.json(
        { error: 'Forbidden - This endpoint is only for clients' },
        { status: 403 }
      );
    }

    // Find the client record linked to this user
    const client = await prisma.client.findFirst({
      where: {
        userId: user.id,
        companyId: user.companyId,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = createReviewSchema.parse(body);

    // Verify the booking belongs to this client and is completed
    const booking = await prisma.booking.findFirst({
      where: {
        id: validatedData.bookingId,
        clientId: client.id,
        companyId: user.companyId,
      },
      include: {
        assignedCleaner: true,
        reviews: {
          where: {
            clientId: client.id,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if booking is completed
    if (booking.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Can only review completed bookings' },
        { status: 400 }
      );
    }

    // Check if review already exists
    if (booking.reviews.length > 0) {
      return NextResponse.json(
        { error: 'You have already reviewed this booking' },
        { status: 400 }
      );
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        bookingId: booking.id,
        clientId: client.id,
        cleanerId: booking.assignedCleanerId,
        overallRating: validatedData.overallRating,
        qualityRating: validatedData.qualityRating,
        punctualityRating: validatedData.punctualityRating,
        communicationRating: validatedData.communicationRating,
        valueRating: validatedData.valueRating,
        title: validatedData.title,
        comment: validatedData.comment,
        isPublic: validatedData.isPublic,
        isVerified: true, // Verified since client is logged in
      },
      include: {
        booking: {
          select: {
            bookingNumber: true,
            scheduledDate: true,
            serviceType: true,
          },
        },
      },
    });

    // Update cleaner's average rating if applicable
    if (booking.assignedCleanerId) {
      const cleanerReviews = await prisma.review.findMany({
        where: {
          cleanerId: booking.assignedCleanerId,
        },
        select: {
          overallRating: true,
        },
      });

      if (cleanerReviews.length > 0) {
        const averageRating =
          cleanerReviews.reduce((sum, r) => sum + r.overallRating, 0) /
          cleanerReviews.length;

        await prisma.teamMember.update({
          where: { id: booking.assignedCleanerId },
          data: {
            averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
          },
        });
      }
    }

    // Also update the booking's customer rating and feedback for quick access
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        customerRating: validatedData.overallRating,
        customerFeedback: validatedData.comment,
        feedbackSubmittedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: review.id,
        bookingId: review.bookingId,
        bookingNumber: review.booking.bookingNumber,
        overallRating: review.overallRating,
        qualityRating: review.qualityRating,
        punctualityRating: review.punctualityRating,
        communicationRating: review.communicationRating,
        valueRating: review.valueRating,
        title: review.title,
        comment: review.comment,
        isPublic: review.isPublic,
        createdAt: review.createdAt,
      },
      message: 'Thank you for your review!',
    });
  } catch (error) {
    console.error('POST /api/client/reviews error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}
