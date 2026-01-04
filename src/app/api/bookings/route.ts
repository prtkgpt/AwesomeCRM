import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createBookingSchema } from '@/lib/validations';
import { generateRecurringDates } from '@/lib/utils';

// GET /api/bookings - List bookings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const clientId = searchParams.get('clientId');

    const bookings = await prisma.booking.findMany({
      where: {
        userId: session.user.id,
        ...(status && { status: status as any }),
        ...(clientId && { clientId }),
        ...(from && to && {
          scheduledDate: {
            gte: new Date(from),
            lte: new Date(to),
          },
        }),
      },
      include: {
        client: true,
        address: true,
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    return NextResponse.json({ success: true, data: bookings });
  } catch (error) {
    console.error('GET /api/bookings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// POST /api/bookings - Create booking (with optional recurring)
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
      select: { companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify client and address belong to user's company
    const client = await prisma.client.findFirst({
      where: {
        id: validatedData.clientId,
        companyId: user.companyId,
      },
      include: {
        addresses: {
          where: {
            id: validatedData.addressId,
          },
        },
      },
    });

    if (!client || client.addresses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Client or address not found' },
        { status: 404 }
      );
    }

    // Create the main booking
    const booking = await prisma.booking.create({
      data: {
        companyId: user.companyId,
        userId: session.user.id,
        clientId: validatedData.clientId,
        addressId: validatedData.addressId,
        scheduledDate: validatedData.scheduledDate,
        duration: validatedData.duration,
        serviceType: validatedData.serviceType,
        price: validatedData.price,
        notes: validatedData.notes,
        internalNotes: validatedData.internalNotes,
        isRecurring: validatedData.isRecurring,
        recurrenceFrequency: validatedData.recurrenceFrequency,
        recurrenceEndDate: validatedData.recurrenceEndDate,
      },
      include: {
        client: true,
        address: true,
      },
    });

    // Generate recurring bookings if needed
    let generatedBookings: any[] = [];
    if (
      validatedData.isRecurring &&
      validatedData.recurrenceFrequency !== 'NONE'
    ) {
      const recurringDates = generateRecurringDates(
        validatedData.scheduledDate,
        validatedData.recurrenceFrequency as 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY',
        validatedData.recurrenceEndDate,
        52 // Max 1 year of occurrences
      );

      generatedBookings = await Promise.all(
        recurringDates.map((date) =>
          prisma.booking.create({
            data: {
              companyId: user.companyId,
              userId: session.user.id,
              clientId: validatedData.clientId,
              addressId: validatedData.addressId,
              scheduledDate: date,
              duration: validatedData.duration,
              serviceType: validatedData.serviceType,
              price: validatedData.price,
              notes: validatedData.notes,
              internalNotes: validatedData.internalNotes,
              isRecurring: true,
              recurrenceFrequency: validatedData.recurrenceFrequency,
              recurrenceParentId: booking.id, // Link to parent
            },
          })
        )
      );
    }

    return NextResponse.json({
      success: true,
      data: booking,
      generatedBookings,
      message: `Booking created successfully${
        generatedBookings.length > 0
          ? ` with ${generatedBookings.length} recurring instances`
          : ''
      }`,
    });
  } catch (error) {
    console.error('POST /api/bookings error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
