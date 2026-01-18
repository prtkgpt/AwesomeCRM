import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { parseDateInCompanyTZ } from '@/lib/utils';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Map frontend service types to database enum values
const serviceTypeMap: Record<string, 'STANDARD' | 'DEEP' | 'MOVE_OUT'> = {
  'REGULAR': 'STANDARD',
  'STANDARD': 'STANDARD',
  'DEEP': 'DEEP',
  'MOVE_IN_OUT': 'MOVE_OUT',
  'MOVE_OUT': 'MOVE_OUT',
};

const publicBookingSchema = z.object({
  // Client info
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone is required'),

  // Service details - accept both frontend and database enum values
  serviceType: z.enum(['REGULAR', 'STANDARD', 'DEEP', 'MOVE_IN_OUT', 'MOVE_OUT'], {
    errorMap: () => ({ message: 'Please select a service type' }),
  }),
  date: z.string().min(1, 'Date is required'),
  timeSlot: z.enum(['MORNING', 'NOON', 'AFTERNOON'], {
    errorMap: () => ({ message: 'Please select a preferred time' }),
  }),
  notes: z.string().optional(),
  selectedExtras: z.array(z.string()).optional(), // Array of addon IDs

  // Insurance
  hasInsurance: z.boolean().optional(),
  insuranceProvider: z.string().optional(),
  helperBeesReferralId: z.string().optional(),

  // Address
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zip: z.string().min(1, 'ZIP code is required'),
  googlePlaceId: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  formattedAddress: z.string().optional(),
  isVerified: z.boolean().optional(),

  // Property details
  propertyType: z.string().optional(),
  squareFootage: z.string().optional(),
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
});

// POST /api/public/bookings/[slug] - Create public booking
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // Find company and get a default user (owner) to assign as creator
    const company = await prisma.company.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        enabledFeatures: true,
        users: {
          where: { role: 'OWNER' },
          take: 1,
          select: { id: true },
        },
      },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    // Get the company owner as the default user
    const defaultUserId = company.users[0]?.id;
    if (!defaultUserId) {
      return NextResponse.json(
        { success: false, error: 'Company configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const validatedData = publicBookingSchema.parse(body);

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find or create client
      let client = await tx.client.findFirst({
        where: {
          companyId: company.id,
          OR: [
            { phone: validatedData.phone },
            ...(validatedData.email ? [{ email: validatedData.email }] : []),
          ],
        },
        include: {
          addresses: true,
        },
      });

      if (!client) {
        // Create new client (assigned to company owner)
        client = await tx.client.create({
          data: {
            companyId: company.id,
            userId: defaultUserId,
            name: validatedData.name,
            email: validatedData.email || undefined,
            phone: validatedData.phone,
            hasInsurance: validatedData.hasInsurance || false,
            insuranceProvider: validatedData.insuranceProvider || undefined,
            helperBeesReferralId: validatedData.helperBeesReferralId || undefined,
            addresses: {
              create: {
                street: validatedData.street,
                city: validatedData.city,
                state: validatedData.state,
                zip: validatedData.zip,
                googlePlaceId: validatedData.googlePlaceId,
                lat: validatedData.lat,
                lng: validatedData.lng,
                formattedAddress: validatedData.formattedAddress,
                isVerified: validatedData.isVerified || false,
                propertyType: validatedData.propertyType || undefined,
                squareFootage: validatedData.squareFootage ? parseInt(validatedData.squareFootage) : undefined,
                bedrooms: validatedData.bedrooms ? parseInt(validatedData.bedrooms) : undefined,
                bathrooms: validatedData.bathrooms ? parseFloat(validatedData.bathrooms) : undefined,
              },
            },
          },
          include: {
            addresses: true,
          },
        });
      }

      // Get or create address if client already exists
      let address = client.addresses?.[0];
      if (!address) {
        address = await tx.address.create({
          data: {
            clientId: client.id,
            street: validatedData.street,
            city: validatedData.city,
            state: validatedData.state,
            zip: validatedData.zip,
            googlePlaceId: validatedData.googlePlaceId,
            lat: validatedData.lat,
            lng: validatedData.lng,
            formattedAddress: validatedData.formattedAddress,
            isVerified: validatedData.isVerified || false,
            propertyType: validatedData.propertyType || undefined,
            squareFootage: validatedData.squareFootage ? parseInt(validatedData.squareFootage) : undefined,
            bedrooms: validatedData.bedrooms ? parseInt(validatedData.bedrooms) : undefined,
            bathrooms: validatedData.bathrooms ? parseFloat(validatedData.bathrooms) : undefined,
          },
        });
      }

      // Create booking
      // Map time slot to actual time
      const timeMap = {
        MORNING: '09:00',
        NOON: '12:00',
        AFTERNOON: '14:00',
      };
      const time = timeMap[validatedData.timeSlot];
      // Parse date as PST (not UTC or local time)
      const scheduledDate = parseDateInCompanyTZ(`${validatedData.date}T${time}`);

      // Fetch selected extras details if any
      let extrasNote = '';
      if (validatedData.selectedExtras && validatedData.selectedExtras.length > 0) {
        const addons = await tx.pricingRule.findMany({
          where: {
            id: { in: validatedData.selectedExtras },
            type: 'ADDON',
          },
          select: {
            name: true,
            duration: true,
          },
        });

        if (addons.length > 0) {
          const extrasNames = addons.map(a => `${a.name} (${a.duration} min)`).join(', ');
          extrasNote = `\n\nSelected Extras: ${extrasNames}`;
        }
      }

      // Combine user notes with extras
      const fullNotes = (validatedData.notes || '') + extrasNote;

      // Map the service type to database enum value
      const dbServiceType = serviceTypeMap[validatedData.serviceType] || 'STANDARD';

      const booking = await tx.booking.create({
        data: {
          companyId: company.id,
          userId: defaultUserId,
          clientId: client.id,
          addressId: address.id,
          scheduledDate,
          duration: 180, // Default 3 hours - admin will adjust based on service type and extras
          serviceType: dbServiceType,
          price: 0, // Price will be calculated later by admin
          status: 'SCHEDULED',
          notes: fullNotes || undefined,
        },
        include: {
          client: true,
          address: true,
        },
      });

      return { booking, client };
    });

    return NextResponse.json({
      success: true,
      data: result.booking,
      message: 'Booking request submitted successfully',
    });
  } catch (error) {
    console.error('Public booking error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
