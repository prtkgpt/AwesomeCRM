// ============================================
// CleanDayCRM - Enhanced Bookings API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, generateBookingNumber } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createBookingSchema } from '@/lib/validations';
import { generateRecurringDates } from '@/lib/utils';
import { sendBookingConfirmation } from '@/lib/notifications';
import { findBestCleaner, autoAssignCleaner } from '@/lib/cleaner-assignment';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Default pagination values
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Calculate booking price based on service, addons, and discounts
 */
function calculateBookingPrice(params: {
  basePrice: number;
  addons?: Array<{ name: string; price: number; quantity?: number }>;
  discountAmount?: number;
  taxRate?: number;
  creditsApplied?: number;
}): {
  subtotal: number;
  addonsTotal: number;
  discountAmount: number;
  taxAmount: number;
  creditsApplied: number;
  finalPrice: number;
} {
  const { basePrice, addons = [], discountAmount = 0, taxRate = 0, creditsApplied = 0 } = params;

  // Calculate addons total
  const addonsTotal = addons.reduce((sum, addon) => {
    return sum + (addon.price * (addon.quantity || 1));
  }, 0);

  // Subtotal before discounts
  const subtotal = basePrice + addonsTotal;

  // Apply discount
  const afterDiscount = Math.max(0, subtotal - discountAmount);

  // Calculate tax
  const taxAmount = afterDiscount * (taxRate / 100);

  // Total before credits
  const totalBeforeCredits = afterDiscount + taxAmount;

  // Apply credits
  const finalPrice = Math.max(0, totalBeforeCredits - creditsApplied);

  return {
    subtotal,
    addonsTotal,
    discountAmount,
    taxAmount,
    creditsApplied,
    finalPrice,
  };
}

// GET /api/bookings - List bookings with filters and pagination
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

    const { searchParams } = new URL(request.url);

    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE)))
    );
    const skip = (page - 1) * limit;

    // Filter parameters
    const status = searchParams.get('status');
    const statuses = searchParams.get('statuses'); // comma-separated list
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const clientId = searchParams.get('clientId');
    const cleanerId = searchParams.get('cleanerId');
    const serviceType = searchParams.get('serviceType');
    const locationId = searchParams.get('locationId');
    const isRecurring = searchParams.get('isRecurring');
    const isPaid = searchParams.get('isPaid');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'scheduledDate';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build date filter
    const dateFilter: Record<string, Date> = {};
    if (from) {
      dateFilter.gte = new Date(from);
    }
    if (to) {
      dateFilter.lte = new Date(to);
    }

    // Build status filter
    let statusFilter: any = undefined;
    if (status) {
      statusFilter = status;
    } else if (statuses) {
      statusFilter = { in: statuses.split(',') };
    }

    // Build where clause based on user role
    let whereClause: any;

    if (user.role === 'CLEANER') {
      const teamMember = await prisma.teamMember.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!teamMember) {
        return NextResponse.json({ success: true, data: [], pagination: { page, limit, total: 0, pages: 0 } });
      }

      // For cleaners: only show their assigned bookings or unassigned
      whereClause = {
        companyId: user.companyId,
        OR: [
          { assignedCleanerId: teamMember.id },
          { assignedCleanerId: null },
        ],
        ...(statusFilter && { status: statusFilter }),
        ...(Object.keys(dateFilter).length > 0 && { scheduledDate: dateFilter }),
        ...(serviceType && { serviceType }),
      };
    } else if (user.role === 'CLIENT') {
      // For clients: only show their own bookings
      const client = await prisma.client.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!client) {
        return NextResponse.json({ success: true, data: [], pagination: { page, limit, total: 0, pages: 0 } });
      }

      whereClause = {
        companyId: user.companyId,
        clientId: client.id,
        ...(statusFilter && { status: statusFilter }),
        ...(Object.keys(dateFilter).length > 0 && { scheduledDate: dateFilter }),
        ...(serviceType && { serviceType }),
      };
    } else {
      // For admins/owners: full access with all filters
      whereClause = {
        companyId: user.companyId,
        ...(statusFilter && { status: statusFilter }),
        ...(clientId && { clientId }),
        ...(cleanerId && { assignedCleanerId: cleanerId }),
        ...(Object.keys(dateFilter).length > 0 && { scheduledDate: dateFilter }),
        ...(serviceType && { serviceType }),
        ...(locationId && { locationId }),
        ...(isRecurring !== null && isRecurring !== undefined && { isRecurring: isRecurring === 'true' }),
        ...(isPaid !== null && isPaid !== undefined && { isPaid: isPaid === 'true' }),
      };

      // Search filter (client name, booking number, address)
      if (search) {
        whereClause.OR = [
          { bookingNumber: { contains: search, mode: 'insensitive' } },
          { client: { firstName: { contains: search, mode: 'insensitive' } } },
          { client: { lastName: { contains: search, mode: 'insensitive' } } },
          { address: { street: { contains: search, mode: 'insensitive' } } },
        ];
      }
    }

    // Get total count for pagination
    const total = await prisma.booking.count({ where: whereClause });

    // Build orderBy
    const validSortFields = ['scheduledDate', 'createdAt', 'finalPrice', 'status', 'bookingNumber'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'scheduledDate';
    const orderDirection = sortOrder === 'desc' ? 'desc' : 'asc';

    // Fetch bookings with relations
    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isVip: true,
            loyaltyTier: true,
          },
        },
        address: {
          select: {
            id: true,
            label: true,
            street: true,
            city: true,
            state: true,
            zip: true,
            propertyType: true,
            bedrooms: true,
            bathrooms: true,
          },
        },
        assignedCleaner: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                avatar: true,
              },
            },
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            type: true,
            basePrice: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { [orderField]: orderDirection },
      skip,
      take: limit,
    });

    // Calculate pagination metadata
    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: bookings,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('GET /api/bookings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// POST /api/bookings - Create booking with auto-generated booking number
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createBookingSchema.parse(body);

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only admins/owners can create bookings (and clients through public booking)
    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get company settings for pricing
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        taxRate: true,
        requireDeposit: true,
        depositPercent: true,
        minimumBookingPrice: true,
      },
    });

    // Verify client and address belong to user's company
    const client = await prisma.client.findFirst({
      where: {
        id: validatedData.clientId,
        companyId: user.companyId,
      },
      include: {
        addresses: {
          where: { id: validatedData.addressId },
        },
        preferences: true,
      },
    });

    if (!client || client.addresses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Client or address not found' },
        { status: 404 }
      );
    }

    // Calculate pricing
    const pricing = calculateBookingPrice({
      basePrice: validatedData.basePrice,
      addons: validatedData.addons,
      discountAmount: 0,
      taxRate: company?.taxRate || 0,
      creditsApplied: validatedData.creditsApplied || 0,
    });

    // Ensure minimum booking price
    if (company?.minimumBookingPrice && pricing.finalPrice < company.minimumBookingPrice) {
      return NextResponse.json(
        { success: false, error: `Minimum booking price is $${company.minimumBookingPrice}` },
        { status: 400 }
      );
    }

    // Generate unique booking number
    const bookingNumber = generateBookingNumber();

    // Calculate deposit if required
    const depositAmount = company?.requireDeposit
      ? pricing.finalPrice * ((company.depositPercent || 25) / 100)
      : null;

    // Handle AI cleaner assignment if requested
    let assignedCleanerId = validatedData.assignedCleanerId || null;
    let assignmentMethod: string | null = null;

    if (body.autoAssignCleaner && !assignedCleanerId) {
      const assignmentResult = await findBestCleaner({
        clientId: validatedData.clientId,
        addressId: validatedData.addressId,
        scheduledDate: validatedData.scheduledDate,
        duration: validatedData.duration,
        serviceType: validatedData.serviceType,
        companyId: user.companyId,
        preferredCleanerId: client.preferences?.preferredCleaner || undefined,
      });

      if (assignmentResult.recommended) {
        assignedCleanerId = assignmentResult.recommended.cleanerId;
        assignmentMethod = 'AUTO';
      }
    } else if (assignedCleanerId) {
      assignmentMethod = 'MANUAL';
    }

    // Calculate scheduled end date
    const scheduledEndDate = new Date(validatedData.scheduledDate);
    scheduledEndDate.setMinutes(scheduledEndDate.getMinutes() + validatedData.duration);

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        companyId: user.companyId,
        bookingNumber,
        clientId: validatedData.clientId,
        addressId: validatedData.addressId,
        createdById: session.user.id,
        serviceId: validatedData.serviceId || null,
        serviceType: validatedData.serviceType,
        locationId: validatedData.locationId || null,
        scheduledDate: validatedData.scheduledDate,
        scheduledEndDate,
        duration: validatedData.duration,
        timeSlot: validatedData.timeSlot || null,
        assignedCleanerId,
        assignmentMethod,
        basePrice: validatedData.basePrice,
        addons: validatedData.addons || [],
        subtotal: pricing.subtotal,
        discountAmount: pricing.discountAmount,
        taxAmount: pricing.taxAmount,
        creditsApplied: pricing.creditsApplied,
        finalPrice: pricing.finalPrice,
        depositAmount,
        hasInsurance: validatedData.hasInsurance || false,
        insuranceAmount: validatedData.insuranceAmount || 0,
        copayAmount: validatedData.copayAmount || 0,
        customerNotes: validatedData.customerNotes || null,
        internalNotes: validatedData.internalNotes || null,
        cleanerNotes: validatedData.cleanerNotes || null,
        isRecurring: validatedData.isRecurring || false,
        recurrenceFrequency: validatedData.recurrenceFrequency || 'NONE',
        recurrenceEndDate: validatedData.recurrenceEndDate || null,
        status: 'PENDING',
        statusHistory: [
          {
            status: 'PENDING',
            timestamp: new Date().toISOString(),
            userId: session.user.id,
          },
        ],
      },
      include: {
        client: true,
        address: true,
        assignedCleaner: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        service: true,
      },
    });

    // Generate recurring bookings if needed
    let generatedBookings: any[] = [];
    if (
      validatedData.isRecurring &&
      validatedData.recurrenceFrequency &&
      validatedData.recurrenceFrequency !== 'NONE'
    ) {
      const endDate = validatedData.recurrenceEndDate ||
        new Date(new Date(validatedData.scheduledDate).setFullYear(
          new Date(validatedData.scheduledDate).getFullYear() + 1
        ));

      const recurringDates = generateRecurringDates(
        validatedData.scheduledDate,
        validatedData.recurrenceFrequency as 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY',
        endDate,
        52
      );

      generatedBookings = await Promise.all(
        recurringDates.map((date) => {
          const endDateTime = new Date(date);
          endDateTime.setMinutes(endDateTime.getMinutes() + validatedData.duration);

          return prisma.booking.create({
            data: {
              companyId: user.companyId,
              bookingNumber: generateBookingNumber(),
              clientId: validatedData.clientId,
              addressId: validatedData.addressId,
              createdById: session.user.id,
              serviceId: validatedData.serviceId || null,
              serviceType: validatedData.serviceType,
              locationId: validatedData.locationId || null,
              scheduledDate: date,
              scheduledEndDate: endDateTime,
              duration: validatedData.duration,
              timeSlot: validatedData.timeSlot || null,
              basePrice: validatedData.basePrice,
              addons: validatedData.addons || [],
              subtotal: pricing.subtotal,
              discountAmount: pricing.discountAmount,
              taxAmount: pricing.taxAmount,
              creditsApplied: 0, // Credits only apply to first booking
              finalPrice: pricing.subtotal - pricing.discountAmount + pricing.taxAmount,
              depositAmount,
              hasInsurance: validatedData.hasInsurance || false,
              insuranceAmount: validatedData.insuranceAmount || 0,
              copayAmount: validatedData.copayAmount || 0,
              customerNotes: validatedData.customerNotes || null,
              internalNotes: validatedData.internalNotes || null,
              cleanerNotes: validatedData.cleanerNotes || null,
              isRecurring: true,
              recurrenceFrequency: validatedData.recurrenceFrequency,
              recurrenceParentId: booking.id,
              status: 'PENDING',
              statusHistory: [
                {
                  status: 'PENDING',
                  timestamp: new Date().toISOString(),
                  userId: session.user.id,
                },
              ],
            },
          });
        })
      );
    }

    // Send booking confirmation (async)
    sendBookingConfirmation(booking.id).catch((error) => {
      console.error('Failed to send booking confirmation:', error);
    });

    return NextResponse.json({
      success: true,
      data: booking,
      generatedBookings: generatedBookings.length,
      assignmentResult: assignedCleanerId ? {
        cleanerId: assignedCleanerId,
        method: assignmentMethod,
      } : null,
      message: `Booking ${bookingNumber} created successfully${
        generatedBookings.length > 0
          ? ` with ${generatedBookings.length} recurring instances`
          : ''
      }${assignedCleanerId && assignmentMethod === 'AUTO' ? ' (cleaner auto-assigned)' : ''}`,
    });
  } catch (error) {
    console.error('POST /api/bookings error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
