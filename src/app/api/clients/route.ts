import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createClientSchema } from '@/lib/validations';
import { stripe } from '@/lib/stripe';
import { generateReferralCode, validateReferralCode, awardReferralCredits } from '@/lib/referral';
import { sendEmail, getReferralUsedEmailTemplate } from '@/lib/email';

// GET /api/clients - List all clients
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);

    const clients = await prisma.client.findMany({
      where: {
        companyId: user.companyId,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(tags && tags.length > 0 && {
          tags: { hasSome: tags },
        }),
      },
      include: {
        addresses: true,
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ success: true, data: clients });
  } catch (error) {
    console.error('GET /api/clients error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

// POST /api/clients - Create new client
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('🔵 CLIENT CREATION - Raw body:', JSON.stringify(body, null, 2));

    const validatedData = createClientSchema.parse(body);
    console.log('🔵 CLIENT CREATION - Validated hasInsurance:', validatedData.hasInsurance);

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create Stripe customer if email provided and Stripe is configured
    let stripeCustomerId: string | undefined;
    if (validatedData.email && stripe) {
      try {
        const stripeCustomer = await stripe.customers.create({
          email: validatedData.email,
          name: validatedData.name,
          phone: validatedData.phone,
        });
        stripeCustomerId = stripeCustomer.id;
      } catch (stripeError) {
        console.error('Stripe customer creation failed:', stripeError);
        // Continue without Stripe customer
      }
    }

    // Validate referral code if provided
    let referrerId: string | undefined;
    const referralCodeInput = (body as any).referralCode;
    if (referralCodeInput) {
      const validation = await validateReferralCode(referralCodeInput, user.companyId);
      if (validation.valid && validation.clientId) {
        referrerId = validation.clientId;
        console.log('🎁 Valid referral code used:', referralCodeInput, 'from:', validation.clientName);
      } else {
        console.warn('⚠️ Invalid referral code provided:', referralCodeInput);
      }
    }

    // Generate unique referral code for this client
    let referralCode = generateReferralCode(validatedData.name, '');
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      // Check if code already exists
      const existing = await prisma.client.findFirst({
        where: { referralCode, companyId: user.companyId },
      });

      if (!existing) {
        break; // Code is unique
      }

      // Generate new code and try again
      attempts++;
      referralCode = generateReferralCode(validatedData.name, '');
    }

    // Create client with addresses
    const client = await prisma.client.create({
      data: {
        companyId: user.companyId,
        userId: session.user.id,
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone,
        tags: validatedData.tags,
        notes: validatedData.notes,
        stripeCustomerId,
        // Referral program
        referralCode,
        referredById: referrerId,
        // Insurance & Helper Bee's fields
        hasInsurance: validatedData.hasInsurance || false,
        helperBeesReferralId: validatedData.helperBeesReferralId,
        insuranceProvider: validatedData.insuranceProvider,
        insurancePaymentAmount: validatedData.insurancePaymentAmount,
        standardCopayAmount: validatedData.standardCopayAmount,
        hasDiscountedCopay: validatedData.hasDiscountedCopay || false,
        copayDiscountAmount: validatedData.copayDiscountAmount,
        copayNotes: validatedData.copayNotes,
        // cleaningObservations: validatedData.cleaningObservations, // TODO: Run migration to add this column
        addresses: {
          create: validatedData.addresses.map((addr) => ({
            label: addr.label,
            street: addr.street,
            city: addr.city,
            state: addr.state,
            zip: addr.zip,
            parkingInfo: addr.parkingInfo,
            gateCode: addr.gateCode,
            petInfo: addr.petInfo,
            preferences: addr.preferences,
            // Google Maps verification
            googlePlaceId: addr.googlePlaceId,
            lat: addr.lat,
            lng: addr.lng,
            isVerified: addr.isVerified || false,
            formattedAddress: addr.formattedAddress,
            // Property details
            propertyType: addr.propertyType,
            squareFootage: addr.squareFootage,
            bedrooms: addr.bedrooms,
            bathrooms: addr.bathrooms,
            floors: addr.floors,
            yearBuilt: addr.yearBuilt,
          })),
        },
      },
      include: {
        addresses: true,
      },
    });

    console.log('🟢 CLIENT CREATED - hasInsurance in DB:', client.hasInsurance);
    console.log('🟢 CLIENT CREATED - Full client:', JSON.stringify({
      id: client.id,
      name: client.name,
      hasInsurance: client.hasInsurance,
      insuranceProvider: client.insuranceProvider,
      helperBeesReferralId: client.helperBeesReferralId,
      referralCode: client.referralCode,
      referredById: client.referredById,
    }, null, 2));

    // Award referral credits if client was referred
    if (referrerId && client.id) {
      try {
        const result = await awardReferralCredits(referrerId, client.id, user.companyId);
        if (result.success) {
          console.log('🎁 Referral credits awarded successfully');

          // Send email notification to referrer
          try {
            // Fetch referrer details
            const referrer = await prisma.client.findUnique({
              where: { id: referrerId },
              select: {
                name: true,
                email: true,
                referralCode: true,
                referralCreditsBalance: true,
              },
            });

            // Fetch company details
            const company = await prisma.company.findUnique({
              where: { id: user.companyId },
              select: {
                name: true,
                resendApiKey: true,
                referralReferrerReward: true,
              },
            });

            if (referrer?.email && company) {
              const emailHtml = getReferralUsedEmailTemplate({
                referrerName: referrer.name,
                newCustomerName: client.name,
                companyName: company.name,
                creditsEarned: company.referralReferrerReward || 25,
                creditsBalance: referrer.referralCreditsBalance,
                referralCode: referrer.referralCode || '',
              });

              await sendEmail({
                to: referrer.email,
                subject: `🎉 ${client.name} used your referral code!`,
                html: emailHtml,
                type: 'notification',
                apiKey: company.resendApiKey || undefined,
              });

              console.log('📧 Referral notification email sent to', referrer.email);
            }
          } catch (emailError) {
            console.error('❌ Failed to send referral notification email:', emailError);
            // Don't fail the request if email fails
          }
        } else {
          console.error('❌ Failed to award referral credits:', result.error);
        }
      } catch (error) {
        console.error('❌ Error awarding referral credits:', error);
        // Don't fail client creation if credits fail
      }
    }

    return NextResponse.json({
      success: true,
      data: client,
      message: 'Client created successfully',
    });
  } catch (error) {
    console.error('POST /api/clients error:', error);

    // Handle Zod validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      const zodError = error as any;
      const fieldErrors = zodError.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      console.error('🔴 Validation errors:', fieldErrors);
      return NextResponse.json(
        {
          success: false,
          error: fieldErrors || 'Invalid input data',
          details: zodError.errors
        },
        { status: 400 }
      );
    }

    // Handle Prisma errors
    if (error instanceof Error && error.message) {
      console.error('🔴 Error message:', error.message);
      console.error('🔴 Error stack:', error.stack);

      // Check for specific Prisma errors
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { success: false, error: 'A client with this email or phone already exists' },
          { status: 400 }
        );
      }

      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { success: false, error: 'Invalid company or user reference' },
          { status: 400 }
        );
      }

      // Return the actual error message for debugging
      return NextResponse.json(
        {
          success: false,
          error: `Failed to create client: ${error.message}`,
          details: error.stack
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create client. Please try again.' },
      { status: 500 }
    );
  }
}
