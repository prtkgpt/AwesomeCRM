import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Validation schema for profile update
const updateClientProfileSchema = z.object({
  // Personal info
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  alternatePhone: z.string().optional(),
  preferredContactMethod: z.enum(['EMAIL', 'SMS', 'PHONE']).optional(),

  // Dates
  birthday: z
    .string()
    .or(z.date())
    .transform((val) => (val ? new Date(val) : undefined))
    .optional(),

  // Communication preferences
  enableBirthdayGreeting: z.boolean().optional(),
  enableAnniversaryGreeting: z.boolean().optional(),
  enablePromotionalEmails: z.boolean().optional(),
});

// Validation schema for address
const addressSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  isPrimary: z.boolean().default(false),
  street: z.string().min(1, 'Street address is required'),
  unit: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(2),
  zip: z.string().min(5, 'ZIP code is required'),
  country: z.string().default('US'),

  // Property details
  propertyType: z
    .enum(['HOUSE', 'CONDO', 'APARTMENT', 'TOWNHOUSE', 'OFFICE', 'AIRBNB'])
    .optional(),
  squareFootage: z.number().min(0).optional(),
  bedrooms: z.number().min(0).max(20).optional(),
  bathrooms: z.number().min(0).max(20).optional(),

  // Access info
  parkingInfo: z.string().optional(),
  gateCode: z.string().optional(),
  entryInstructions: z.string().optional(),

  // Pet info
  hasPets: z.boolean().default(false),
  petDetails: z.string().optional(),
  petInstructions: z.string().optional(),

  // Notes
  specialInstructions: z.string().optional(),
});

// Validation schema for preferences
const preferencesSchema = z.object({
  cleaningSequence: z.string().optional(),
  priorityAreas: z.string().optional(),
  areasToAvoid: z.string().optional(),
  productAllergies: z.string().optional(),
  preferredProducts: z.string().optional(),
  customerProvidesProducts: z.boolean().optional(),
  avoidScents: z.boolean().optional(),
  scentPreferences: z.string().optional(),
  ecoFriendlyOnly: z.boolean().optional(),
  petHandlingInstructions: z.string().optional(),
  preferredCleaner: z.string().optional(),
  languagePreference: z.string().optional(),
  communicationNotes: z.string().optional(),
  temperaturePreference: z.string().optional(),
  musicPreference: z.string().optional(),
  doNotDisturb: z.string().optional(),
  plantWatering: z.boolean().optional(),
  plantInstructions: z.string().optional(),
  mailCollection: z.boolean().optional(),
  trashTakeout: z.boolean().optional(),
  otherTasks: z.string().optional(),
});

// Combined update schema
const fullUpdateSchema = z.object({
  profile: updateClientProfileSchema.optional(),
  addresses: z.array(addressSchema).optional(),
  preferences: preferencesSchema.optional(),
});

/**
 * GET /api/client/profile - Get client profile with addresses and preferences
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
      select: { id: true, role: true, companyId: true, email: true },
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
        addresses: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        preferences: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email || user.email,
          phone: client.phone,
          alternatePhone: client.alternatePhone,
          preferredContactMethod: client.preferredContactMethod,
          birthday: client.birthday,
          isVip: client.isVip,
          tags: client.tags,
          // Communication preferences
          enableBirthdayGreeting: client.enableBirthdayGreeting,
          enableAnniversaryGreeting: client.enableAnniversaryGreeting,
          enablePromotionalEmails: client.enablePromotionalEmails,
          // Loyalty info
          loyaltyTier: client.loyaltyTier,
          loyaltyPoints: client.loyaltyPoints,
          totalSpent: client.totalSpent,
          totalBookings: client.totalBookings,
          // Credits
          creditBalance: client.creditBalance,
          // Referral info
          referralCode: client.referralCode,
          referralTier: client.referralTier,
          // Dates
          firstBookingDate: client.firstBookingDate,
          lastBookingDate: client.lastBookingDate,
          createdAt: client.createdAt,
        },
        addresses: client.addresses.map((addr) => ({
          id: addr.id,
          label: addr.label,
          isPrimary: addr.isPrimary,
          street: addr.street,
          unit: addr.unit,
          city: addr.city,
          state: addr.state,
          zip: addr.zip,
          country: addr.country,
          formattedAddress: addr.formattedAddress,
          // Property details
          propertyType: addr.propertyType,
          squareFootage: addr.squareFootage,
          bedrooms: addr.bedrooms,
          bathrooms: addr.bathrooms,
          floors: addr.floors,
          hasBasement: addr.hasBasement,
          hasGarage: addr.hasGarage,
          hasYard: addr.hasYard,
          hasPool: addr.hasPool,
          // Access
          parkingInfo: addr.parkingInfo,
          gateCode: addr.gateCode,
          entryInstructions: addr.entryInstructions,
          // Pets
          hasPets: addr.hasPets,
          petDetails: addr.petDetails,
          petInstructions: addr.petInstructions,
          // Notes
          specialInstructions: addr.specialInstructions,
          cleanerNotes: addr.cleanerNotes,
        })),
        preferences: client.preferences
          ? {
              cleaningSequence: client.preferences.cleaningSequence,
              priorityAreas: client.preferences.priorityAreas,
              areasToAvoid: client.preferences.areasToAvoid,
              productAllergies: client.preferences.productAllergies,
              preferredProducts: client.preferences.preferredProducts,
              customerProvidesProducts: client.preferences.customerProvidesProducts,
              avoidScents: client.preferences.avoidScents,
              scentPreferences: client.preferences.scentPreferences,
              ecoFriendlyOnly: client.preferences.ecoFriendlyOnly,
              petHandlingInstructions: client.preferences.petHandlingInstructions,
              preferredCleaner: client.preferences.preferredCleaner,
              languagePreference: client.preferences.languagePreference,
              communicationNotes: client.preferences.communicationNotes,
              temperaturePreference: client.preferences.temperaturePreference,
              musicPreference: client.preferences.musicPreference,
              doNotDisturb: client.preferences.doNotDisturb,
              plantWatering: client.preferences.plantWatering,
              plantInstructions: client.preferences.plantInstructions,
              mailCollection: client.preferences.mailCollection,
              trashTakeout: client.preferences.trashTakeout,
              otherTasks: client.preferences.otherTasks,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('GET /api/client/profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/client/profile - Update client profile, addresses, and preferences
 */
export async function PUT(request: NextRequest) {
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
        preferences: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = fullUpdateSchema.parse(body);

    // Start a transaction for all updates
    await prisma.$transaction(async (tx) => {
      // Update profile
      if (validatedData.profile) {
        await tx.client.update({
          where: { id: client.id },
          data: {
            ...(validatedData.profile.firstName && {
              firstName: validatedData.profile.firstName,
            }),
            ...(validatedData.profile.lastName !== undefined && {
              lastName: validatedData.profile.lastName,
            }),
            ...(validatedData.profile.phone !== undefined && {
              phone: validatedData.profile.phone,
            }),
            ...(validatedData.profile.alternatePhone !== undefined && {
              alternatePhone: validatedData.profile.alternatePhone,
            }),
            ...(validatedData.profile.preferredContactMethod && {
              preferredContactMethod: validatedData.profile.preferredContactMethod,
            }),
            ...(validatedData.profile.birthday !== undefined && {
              birthday: validatedData.profile.birthday,
            }),
            ...(validatedData.profile.enableBirthdayGreeting !== undefined && {
              enableBirthdayGreeting: validatedData.profile.enableBirthdayGreeting,
            }),
            ...(validatedData.profile.enableAnniversaryGreeting !== undefined && {
              enableAnniversaryGreeting:
                validatedData.profile.enableAnniversaryGreeting,
            }),
            ...(validatedData.profile.enablePromotionalEmails !== undefined && {
              enablePromotionalEmails:
                validatedData.profile.enablePromotionalEmails,
            }),
          },
        });
      }

      // Update addresses
      if (validatedData.addresses) {
        for (const addr of validatedData.addresses) {
          if (addr.id) {
            // Verify the address belongs to this client
            const existingAddr = client.addresses.find((a) => a.id === addr.id);
            if (!existingAddr) {
              throw new Error(`Address ${addr.id} not found`);
            }

            // Update existing address
            await tx.address.update({
              where: { id: addr.id },
              data: {
                label: addr.label,
                isPrimary: addr.isPrimary,
                street: addr.street,
                unit: addr.unit,
                city: addr.city,
                state: addr.state,
                zip: addr.zip,
                country: addr.country,
                propertyType: addr.propertyType,
                squareFootage: addr.squareFootage,
                bedrooms: addr.bedrooms,
                bathrooms: addr.bathrooms,
                parkingInfo: addr.parkingInfo,
                gateCode: addr.gateCode,
                entryInstructions: addr.entryInstructions,
                hasPets: addr.hasPets,
                petDetails: addr.petDetails,
                petInstructions: addr.petInstructions,
                specialInstructions: addr.specialInstructions,
              },
            });

            // If setting as primary, unset other addresses
            if (addr.isPrimary) {
              await tx.address.updateMany({
                where: {
                  clientId: client.id,
                  id: { not: addr.id },
                },
                data: { isPrimary: false },
              });
            }
          } else {
            // Create new address
            const newAddress = await tx.address.create({
              data: {
                clientId: client.id,
                label: addr.label,
                isPrimary: addr.isPrimary,
                street: addr.street,
                unit: addr.unit,
                city: addr.city,
                state: addr.state,
                zip: addr.zip,
                country: addr.country,
                propertyType: addr.propertyType,
                squareFootage: addr.squareFootage,
                bedrooms: addr.bedrooms,
                bathrooms: addr.bathrooms,
                parkingInfo: addr.parkingInfo,
                gateCode: addr.gateCode,
                entryInstructions: addr.entryInstructions,
                hasPets: addr.hasPets,
                petDetails: addr.petDetails,
                petInstructions: addr.petInstructions,
                specialInstructions: addr.specialInstructions,
              },
            });

            // If setting as primary, unset other addresses
            if (addr.isPrimary) {
              await tx.address.updateMany({
                where: {
                  clientId: client.id,
                  id: { not: newAddress.id },
                },
                data: { isPrimary: false },
              });
            }
          }
        }
      }

      // Update preferences
      if (validatedData.preferences) {
        if (client.preferences) {
          await tx.clientPreference.update({
            where: { id: client.preferences.id },
            data: validatedData.preferences,
          });
        } else {
          await tx.clientPreference.create({
            data: {
              clientId: client.id,
              ...validatedData.preferences,
            },
          });
        }
      }
    });

    // Fetch updated data
    const updatedClientFull = await prisma.client.findUnique({
      where: { id: client.id },
      include: {
        addresses: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        preferences: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          id: updatedClientFull!.id,
          firstName: updatedClientFull!.firstName,
          lastName: updatedClientFull!.lastName,
          email: updatedClientFull!.email,
          phone: updatedClientFull!.phone,
          alternatePhone: updatedClientFull!.alternatePhone,
          preferredContactMethod: updatedClientFull!.preferredContactMethod,
          birthday: updatedClientFull!.birthday,
          enableBirthdayGreeting: updatedClientFull!.enableBirthdayGreeting,
          enableAnniversaryGreeting: updatedClientFull!.enableAnniversaryGreeting,
          enablePromotionalEmails: updatedClientFull!.enablePromotionalEmails,
        },
        addresses: updatedClientFull!.addresses,
        preferences: updatedClientFull!.preferences,
      },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/client/profile error:', error);

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

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
