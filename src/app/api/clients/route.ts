import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createClientSchema } from '@/lib/validations';
import { stripe } from '@/lib/stripe';

// GET /api/clients - List all clients
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);

    const clients = await prisma.client.findMany({
      where: {
        userId: session.user.id,
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
    const validatedData = createClientSchema.parse(body);

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

    // Create client with addresses
    const client = await prisma.client.create({
      data: {
        userId: session.user.id,
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone,
        tags: validatedData.tags,
        notes: validatedData.notes,
        stripeCustomerId,
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
          })),
        },
      },
      include: {
        addresses: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: client,
      message: 'Client created successfully',
    });
  } catch (error) {
    console.error('POST /api/clients error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create client' },
      { status: 500 }
    );
  }
}
