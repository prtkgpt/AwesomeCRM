import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { startOfDay, addHours, addDays, isBefore, isAfter, format } from 'date-fns';

const createBookingSchema = z.object({
  addressId: z.string().min(1, 'Address is required'),
  scheduledDate: z.string().datetime('Valid date/time required'),
  serviceType: z.enum(['STANDARD', 'DEEP', 'MOVE_OUT']),
  duration: z.number().min(60).optional(), // Minutes, will be calculated if not provided
  notes: z.string().optional(),
  useReferralCredits: z.boolean().optional(),
  referralCreditsToApply: z.number().min(0).optional(),
});

// GET: Get available time slots for booking
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { customerClient: true },
    });

    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date'); // YYYY-MM-DD
    const addressId = searchParams.get('addressId');
    const serviceType = searchParams.get('serviceType') || 'STANDARD';

    // Get company settings
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        onlineBookingEnabled: true,
        minimumLeadTimeHours: true,
        maxDaysAhead: true,
        hourlyRate: true,
        serviceTypeMultipliers: true,
      },
    });

    if (!company?.onlineBookingEnabled) {
      return NextResponse.json(
        { error: 'Online booking is not enabled. Please contact us to schedule.' },
        { status: 400 }
      );
    }

    // Calculate booking window
    const now = new Date();
    const minDate = addHours(now, company.minimumLeadTimeHours || 2);
    const maxDate = addDays(now, company.maxDaysAhead || 60);

    // Get address details for pricing
    let address = null;
    if (addressId) {
      address = await prisma.address.findFirst({
        where: {
          id: addressId,
          clientId: user.customerClient?.id,
        },
      });
    }

    // Get pricing rules
    const pricingRules = await prisma.pricingRule.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
        OR: [
          { serviceType: null },
          { serviceType: serviceType },
        ],
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Calculate estimated price based on address
    let estimatedPrice = 0;
    let estimatedDuration = 120; // Default 2 hours

    if (address) {
      const bedroomRule = pricingRules.find(
        (r) => r.type === 'BEDROOM' && r.quantity === (address.bedrooms || 0)
      );
      const bathroomRule = pricingRules.find(
        (r) => r.type === 'BATHROOM' && r.quantity === (address.bathrooms || 0)
      );

      if (bedroomRule) {
        estimatedPrice += bedroomRule.price;
        estimatedDuration += bedroomRule.duration || 0;
      }
      if (bathroomRule) {
        estimatedPrice += bathroomRule.price;
        estimatedDuration += bathroomRule.duration || 0;
      }
    }

    // Apply service type multiplier
    const multipliers = company.serviceTypeMultipliers as Record<string, number> | null;
    const multiplier = multipliers?.[serviceType] || 1;
    estimatedPrice = Math.round(estimatedPrice * multiplier * 100) / 100;

    // If no price calculated, use hourly rate
    if (estimatedPrice === 0 && company.hourlyRate) {
      estimatedPrice = company.hourlyRate * (estimatedDuration / 60);
    }

    // Generate available time slots if date provided
    let availableSlots: string[] = [];
    if (dateStr) {
      const requestedDate = startOfDay(new Date(dateStr));

      // Check if date is within booking window
      if (isBefore(requestedDate, startOfDay(minDate))) {
        return NextResponse.json(
          { error: `Minimum lead time is ${company.minimumLeadTimeHours} hours` },
          { status: 400 }
        );
      }
      if (isAfter(requestedDate, maxDate)) {
        return NextResponse.json(
          { error: `Bookings can only be made up to ${company.maxDaysAhead} days in advance` },
          { status: 400 }
        );
      }

      // Get existing bookings for the date
      const existingBookings = await prisma.booking.findMany({
        where: {
          companyId: user.companyId,
          status: { not: 'CANCELLED' },
          scheduledDate: {
            gte: requestedDate,
            lt: addDays(requestedDate, 1),
          },
        },
        select: { scheduledDate: true, duration: true },
      });

      // Generate slots (8am - 6pm, every 30 minutes)
      const slots = [];
      for (let hour = 8; hour <= 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slotTime = new Date(requestedDate);
          slotTime.setHours(hour, minute, 0, 0);

          // Check if slot is in the past
          if (isBefore(slotTime, minDate)) continue;

          // Check if slot conflicts with existing bookings (simplified)
          const hasConflict = existingBookings.some((b) => {
            const bookingStart = new Date(b.scheduledDate);
            const bookingEnd = addHours(bookingStart, b.duration / 60);
            const slotEnd = addHours(slotTime, estimatedDuration / 60);

            return (
              (slotTime >= bookingStart && slotTime < bookingEnd) ||
              (slotEnd > bookingStart && slotEnd <= bookingEnd)
            );
          });

          if (!hasConflict) {
            slots.push(format(slotTime, "yyyy-MM-dd'T'HH:mm:ss"));
          }
        }
      }
      availableSlots = slots;
    }

    return NextResponse.json({
      success: true,
      data: {
        bookingWindow: {
          minDate: minDate.toISOString(),
          maxDate: maxDate.toISOString(),
          minimumLeadTimeHours: company.minimumLeadTimeHours,
          maxDaysAhead: company.maxDaysAhead,
        },
        estimate: {
          serviceType,
          estimatedPrice,
          estimatedDuration,
          address: address
            ? {
                id: address.id,
                full: `${address.street}, ${address.city}, ${address.state} ${address.zip}`,
                bedrooms: address.bedrooms,
                bathrooms: address.bathrooms,
              }
            : null,
        },
        availableSlots,
        pricingRules: pricingRules.map((r) => ({
          id: r.id,
          type: r.type,
          name: r.name,
          price: r.price,
          duration: r.duration,
        })),
      },
    });
  } catch (error) {
    console.error('Get booking slots error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new booking (self-service)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { customerClient: true },
    });

    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!user.customerClient) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    // Get company settings
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        onlineBookingEnabled: true,
        requireApproval: true,
        minimumLeadTimeHours: true,
        maxDaysAhead: true,
        hourlyRate: true,
        serviceTypeMultipliers: true,
      },
    });

    if (!company?.onlineBookingEnabled) {
      return NextResponse.json(
        { error: 'Online booking is not enabled' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = createBookingSchema.parse(body);

    const scheduledDate = new Date(validatedData.scheduledDate);
    const now = new Date();
    const minDate = addHours(now, company.minimumLeadTimeHours || 2);
    const maxDate = addDays(now, company.maxDaysAhead || 60);

    // Validate booking window
    if (isBefore(scheduledDate, minDate)) {
      return NextResponse.json(
        { error: `Bookings require at least ${company.minimumLeadTimeHours} hours notice` },
        { status: 400 }
      );
    }
    if (isAfter(scheduledDate, maxDate)) {
      return NextResponse.json(
        { error: `Bookings can only be made up to ${company.maxDaysAhead} days in advance` },
        { status: 400 }
      );
    }

    // Verify address belongs to customer
    const address = await prisma.address.findFirst({
      where: {
        id: validatedData.addressId,
        clientId: user.customerClient.id,
      },
    });

    if (!address) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    // Calculate price
    const pricingRules = await prisma.pricingRule.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
        OR: [
          { serviceType: null },
          { serviceType: validatedData.serviceType },
        ],
      },
    });

    let price = 0;
    let duration = validatedData.duration || 120;

    const bedroomRule = pricingRules.find(
      (r) => r.type === 'BEDROOM' && r.quantity === (address.bedrooms || 0)
    );
    const bathroomRule = pricingRules.find(
      (r) => r.type === 'BATHROOM' && r.quantity === (address.bathrooms || 0)
    );

    if (bedroomRule) {
      price += bedroomRule.price;
      if (!validatedData.duration) duration += bedroomRule.duration || 0;
    }
    if (bathroomRule) {
      price += bathroomRule.price;
      if (!validatedData.duration) duration += bathroomRule.duration || 0;
    }

    // Apply service type multiplier
    const multipliers = company.serviceTypeMultipliers as Record<string, number> | null;
    const multiplier = multipliers?.[validatedData.serviceType] || 1;
    price = Math.round(price * multiplier * 100) / 100;

    // Fallback to hourly rate
    if (price === 0 && company.hourlyRate) {
      price = company.hourlyRate * (duration / 60);
    }

    // Apply referral credits if requested
    let referralCreditsApplied = 0;
    let finalPrice = price;

    if (validatedData.useReferralCredits && user.customerClient.referralCreditsBalance > 0) {
      const creditsToApply = validatedData.referralCreditsToApply || user.customerClient.referralCreditsBalance;
      referralCreditsApplied = Math.min(creditsToApply, user.customerClient.referralCreditsBalance, price);
      finalPrice = price - referralCreditsApplied;
    }

    // Create the booking
    const booking = await prisma.$transaction(async (tx) => {
      // Create booking
      const newBooking = await tx.booking.create({
        data: {
          companyId: user.companyId,
          userId: session.user.id,
          clientId: user.customerClient!.id,
          addressId: address.id,
          customerId: session.user.id,
          scheduledDate,
          duration,
          serviceType: validatedData.serviceType,
          status: 'SCHEDULED',
          price,
          referralCreditsApplied,
          finalPrice: referralCreditsApplied > 0 ? finalPrice : null,
          notes: validatedData.notes,
        },
        include: {
          address: true,
          client: { select: { name: true } },
        },
      });

      // Deduct referral credits if used
      if (referralCreditsApplied > 0) {
        await tx.client.update({
          where: { id: user.customerClient!.id },
          data: {
            referralCreditsUsed: { increment: referralCreditsApplied },
            referralCreditsBalance: { decrement: referralCreditsApplied },
          },
        });

        await tx.referralCreditTransaction.create({
          data: {
            clientId: user.customerClient!.id,
            companyId: user.companyId,
            amount: -referralCreditsApplied,
            type: 'USED',
            description: `Applied to booking on ${format(scheduledDate, 'MMM d, yyyy')}`,
            relatedBookingId: newBooking.id,
            status: 'USED',
          },
        });
      }

      return newBooking;
    });

    return NextResponse.json({
      success: true,
      data: {
        id: booking.id,
        scheduledDate: booking.scheduledDate,
        formattedDate: format(new Date(booking.scheduledDate), 'EEEE, MMMM d, yyyy'),
        formattedTime: format(new Date(booking.scheduledDate), 'h:mm a'),
        serviceType: booking.serviceType,
        duration: booking.duration,
        price: booking.price,
        referralCreditsApplied: booking.referralCreditsApplied,
        finalPrice: booking.finalPrice || booking.price,
        address: `${booking.address.street}, ${booking.address.city}, ${booking.address.state} ${booking.address.zip}`,
        status: booking.status,
        message: company.requireApproval
          ? 'Your booking request has been submitted and is pending approval.'
          : 'Your booking has been confirmed!',
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Create customer booking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
