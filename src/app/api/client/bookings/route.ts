import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, generateBookingNumber } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Validation schema for client booking request
const clientBookingRequestSchema = z.object({
  addressId: z.string().min(1, 'Address is required'),
  serviceId: z.string().optional(),
  serviceType: z
    .enum([
      'STANDARD',
      'DEEP',
      'MOVE_IN',
      'MOVE_OUT',
      'POST_CONSTRUCTION',
      'POST_PARTY',
      'OFFICE',
      'AIRBNB',
      'CUSTOM',
    ])
    .default('STANDARD'),
  scheduledDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val)),
  preferredTimeSlot: z.enum(['MORNING', 'AFTERNOON', 'EVENING']).optional(),
  duration: z.number().min(30, 'Duration must be at least 30 minutes').optional(),
  customerNotes: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z
    .enum(['NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM'])
    .default('NONE'),
  recurrenceEndDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .optional(),
  applyCredits: z.boolean().default(false),
});

/**
 * GET /api/client/bookings - List client's bookings with pagination
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
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const sortBy = searchParams.get('sortBy') || 'scheduledDate';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    const upcoming = searchParams.get('upcoming') === 'true';
    const past = searchParams.get('past') === 'true';

    // Build where clause
    const whereClause: any = {
      clientId: client.id,
      companyId: user.companyId,
    };

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    // Filter for upcoming or past bookings
    const now = new Date();
    if (upcoming) {
      whereClause.scheduledDate = { gte: now };
      whereClause.status = { in: ['PENDING', 'CONFIRMED', 'CLEANER_EN_ROUTE', 'IN_PROGRESS'] };
    } else if (past) {
      whereClause.OR = [
        { scheduledDate: { lt: now } },
        { status: { in: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] } },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.booking.count({
      where: whereClause,
    });

    // Calculate pagination
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch bookings
    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        address: {
          select: {
            id: true,
            label: true,
            street: true,
            city: true,
            state: true,
            zip: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
          },
        },
        assignedCleaner: {
          select: {
            id: true,
            averageRating: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        reviews: {
          where: {
            clientId: client.id,
          },
          select: {
            id: true,
            overallRating: true,
            createdAt: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: bookings.map((booking) => ({
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        scheduledDate: booking.scheduledDate,
        scheduledEndDate: booking.scheduledEndDate,
        duration: booking.duration,
        serviceType: booking.serviceType,
        service: booking.service,
        status: booking.status,
        basePrice: booking.basePrice,
        finalPrice: booking.finalPrice,
        discountAmount: booking.discountAmount,
        creditsApplied: booking.creditsApplied,
        isPaid: booking.isPaid,
        paymentStatus: booking.paymentStatus,
        customerNotes: booking.customerNotes,
        isRecurring: booking.isRecurring,
        recurrenceFrequency: booking.recurrenceFrequency,
        address: booking.address,
        cleaner: booking.assignedCleaner
          ? {
              id: booking.assignedCleaner.id,
              firstName: booking.assignedCleaner.user.firstName,
              lastName: booking.assignedCleaner.user.lastName,
              avatar: booking.assignedCleaner.user.avatar,
              averageRating: booking.assignedCleaner.averageRating,
            }
          : null,
        hasReview: booking.reviews.length > 0,
        review: booking.reviews[0] || null,
        createdAt: booking.createdAt,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('GET /api/client/bookings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/client/bookings - Create new booking request from client portal
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
      include: {
        addresses: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = clientBookingRequestSchema.parse(body);

    // Verify the address belongs to this client
    const address = client.addresses.find((a) => a.id === validatedData.addressId);
    if (!address) {
      return NextResponse.json(
        { error: 'Invalid address - address does not belong to this client' },
        { status: 400 }
      );
    }

    // Get company settings
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        onlineBookingEnabled: true,
        minimumLeadTime: true,
        maximumLeadTime: true,
        requireApproval: true,
        minimumBookingPrice: true,
        baseHourlyRate: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if online booking is enabled
    if (!company.onlineBookingEnabled) {
      return NextResponse.json(
        { error: 'Online booking is not currently available. Please call to schedule.' },
        { status: 400 }
      );
    }

    // Validate scheduling constraints
    const now = new Date();
    const scheduledDate = new Date(validatedData.scheduledDate);

    // Check minimum lead time
    const minimumLeadHours = company.minimumLeadTime || 2;
    const minimumDate = new Date(now.getTime() + minimumLeadHours * 60 * 60 * 1000);
    if (scheduledDate < minimumDate) {
      return NextResponse.json(
        {
          error: `Bookings must be scheduled at least ${minimumLeadHours} hours in advance`,
        },
        { status: 400 }
      );
    }

    // Check maximum lead time
    const maximumLeadDays = company.maximumLeadTime || 60;
    const maximumDate = new Date(
      now.getTime() + maximumLeadDays * 24 * 60 * 60 * 1000
    );
    if (scheduledDate > maximumDate) {
      return NextResponse.json(
        {
          error: `Bookings cannot be scheduled more than ${maximumLeadDays} days in advance`,
        },
        { status: 400 }
      );
    }

    // Get service details if provided
    let service = null;
    let basePrice = company.minimumBookingPrice || 100;
    let duration = validatedData.duration || 120;

    if (validatedData.serviceId) {
      service = await prisma.service.findFirst({
        where: {
          id: validatedData.serviceId,
          companyId: user.companyId,
          isActive: true,
          isPublic: true,
        },
      });

      if (service) {
        basePrice = service.basePrice;
        duration = validatedData.duration || service.baseDuration;
      }
    }

    // Calculate scheduled end date
    const scheduledEndDate = new Date(
      scheduledDate.getTime() + duration * 60 * 1000
    );

    // Calculate credits to apply
    let creditsApplied = 0;
    let finalPrice = basePrice;

    if (validatedData.applyCredits && client.creditBalance > 0) {
      creditsApplied = Math.min(client.creditBalance, basePrice);
      finalPrice = basePrice - creditsApplied;
    }

    // Generate booking number
    const bookingNumber = generateBookingNumber();

    // Determine initial status
    const initialStatus = company.requireApproval ? 'PENDING' : 'CONFIRMED';

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        companyId: user.companyId,
        clientId: client.id,
        addressId: validatedData.addressId,
        createdById: user.id,
        serviceId: validatedData.serviceId || null,
        serviceType: validatedData.serviceType,
        scheduledDate: scheduledDate,
        scheduledEndDate,
        duration,
        timeSlot: validatedData.preferredTimeSlot || null,
        basePrice,
        subtotal: basePrice,
        finalPrice,
        creditsApplied,
        status: initialStatus,
        customerNotes: validatedData.customerNotes,
        isRecurring: validatedData.isRecurring,
        recurrenceFrequency: validatedData.recurrenceFrequency,
        recurrenceEndDate: validatedData.recurrenceEndDate || null,
      },
      include: {
        address: true,
        service: true,
      },
    });

    // Deduct credits if applied
    if (creditsApplied > 0) {
      await prisma.$transaction([
        prisma.client.update({
          where: { id: client.id },
          data: {
            creditBalance: { decrement: creditsApplied },
          },
        }),
        prisma.creditTransaction.create({
          data: {
            clientId: client.id,
            type: 'LOYALTY_USED',
            amount: -creditsApplied,
            balance: client.creditBalance - creditsApplied,
            description: `Applied to booking ${bookingNumber}`,
            referenceType: 'BOOKING',
            referenceId: booking.id,
            status: 'USED',
            usedAt: new Date(),
          },
        }),
      ]);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        scheduledDate: booking.scheduledDate,
        duration: booking.duration,
        serviceType: booking.serviceType,
        service: booking.service,
        status: booking.status,
        basePrice: booking.basePrice,
        creditsApplied: booking.creditsApplied,
        finalPrice: booking.finalPrice,
        address: booking.address,
        isRecurring: booking.isRecurring,
        recurrenceFrequency: booking.recurrenceFrequency,
      },
      message: company.requireApproval
        ? 'Booking request submitted successfully. You will be notified once it is confirmed.'
        : 'Booking confirmed successfully!',
    });
  } catch (error) {
    console.error('POST /api/client/bookings error:', error);

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
      { success: false, error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
