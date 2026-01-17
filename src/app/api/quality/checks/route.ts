import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Validation schema for creating quality checks
const createQualityCheckSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  cleanerId: z.string().min(1, 'Cleaner ID is required'),
  checkerId: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// Validation schema for query params
const queryParamsSchema = z.object({
  status: z.enum(['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'PASSED', 'FAILED', 'NEEDS_ATTENTION']).optional(),
  cleanerId: z.string().optional(),
  checkerId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// GET /api/quality/checks - List quality checks with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can view quality checks
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = queryParamsSchema.parse({
      status: searchParams.get('status') || undefined,
      cleanerId: searchParams.get('cleanerId') || undefined,
      checkerId: searchParams.get('checkerId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
    });

    const { status, cleanerId, checkerId, startDate, endDate, page, limit } = queryParams;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      companyId: user.companyId,
    };

    if (status) {
      where.status = status;
    }

    if (cleanerId) {
      where.cleanerId = cleanerId;
    }

    if (checkerId) {
      where.checkerId = checkerId;
    }

    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) {
        where.scheduledAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.scheduledAt.lte = new Date(endDate);
      }
    }

    // Fetch quality checks with pagination
    const [qualityChecks, totalCount] = await Promise.all([
      prisma.qualityCheck.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              scheduledDate: true,
              status: true,
              client: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              address: {
                select: {
                  id: true,
                  street: true,
                  city: true,
                  state: true,
                  zip: true,
                },
              },
            },
          },
          cleaner: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              averageRating: true,
              totalJobsCompleted: true,
            },
          },
          checker: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' },
          { scheduledAt: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.qualityCheck.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: qualityChecks,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('GET /api/quality/checks error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch quality checks' },
      { status: 500 }
    );
  }
}

// POST /api/quality/checks - Create new quality check for a booking
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can create quality checks
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createQualityCheckSchema.parse(body);

    // Verify the booking exists and belongs to the company
    const booking = await prisma.booking.findFirst({
      where: {
        id: validatedData.bookingId,
        companyId: user.companyId,
      },
      include: {
        qualityCheck: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if a quality check already exists for this booking
    if (booking.qualityCheck) {
      return NextResponse.json(
        { success: false, error: 'A quality check already exists for this booking' },
        { status: 400 }
      );
    }

    // Verify the cleaner exists and belongs to the company
    const cleaner = await prisma.teamMember.findFirst({
      where: {
        id: validatedData.cleanerId,
        companyId: user.companyId,
      },
    });

    if (!cleaner) {
      return NextResponse.json(
        { success: false, error: 'Cleaner not found' },
        { status: 404 }
      );
    }

    // If checkerId is provided, verify it exists
    if (validatedData.checkerId) {
      const checker = await prisma.user.findFirst({
        where: {
          id: validatedData.checkerId,
          companyId: user.companyId,
          role: { in: ['OWNER', 'ADMIN'] },
        },
      });

      if (!checker) {
        return NextResponse.json(
          { success: false, error: 'Checker not found or does not have permission' },
          { status: 404 }
        );
      }
    }

    // Create the quality check
    const qualityCheck = await prisma.qualityCheck.create({
      data: {
        companyId: user.companyId,
        bookingId: validatedData.bookingId,
        cleanerId: validatedData.cleanerId,
        checkerId: validatedData.checkerId,
        scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : null,
        status: validatedData.scheduledAt ? 'SCHEDULED' : 'PENDING',
        notes: validatedData.notes,
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            scheduledDate: true,
            status: true,
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        cleaner: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        checker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: qualityCheck,
      message: 'Quality check created successfully',
    });
  } catch (error) {
    console.error('POST /api/quality/checks error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create quality check' },
      { status: 500 }
    );
  }
}
