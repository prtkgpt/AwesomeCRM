import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/estimates - Create new estimate/quote
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can create estimates
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      customerType,
      clientId,
      newCustomer,
      serviceType,
      sqftRange,
      bedrooms,
      bathrooms,
      serviceAreas,
      addons,
      scheduledDate,
      priority,
      customerNotes,
      internalNotes,
      providerNotes,
      price,
      duration,
      excludeCancellationFee,
      excludeCustomerNotification,
      excludeProviderNotification,
    } = body;

    let finalClientId = clientId;
    let addressId = null;

    // Create new client if needed
    if (customerType === 'new' && newCustomer) {
      // Create new client
      const client = await prisma.client.create({
        data: {
          companyId: user.companyId,
          userId: user.id,
          name: `${newCustomer.firstName} ${newCustomer.lastName}`,
          email: newCustomer.email,
          phone: newCustomer.phone,
        },
      });

      finalClientId = client.id;

      // Create address
      const address = await prisma.address.create({
        data: {
          clientId: client.id,
          label: 'Home',
          street: newCustomer.address,
          city: newCustomer.city,
          state: newCustomer.state,
          zip: newCustomer.zip,
        },
      });

      addressId = address.id;
    } else if (clientId) {
      // Verify existing client belongs to user's company
      const existingClient = await prisma.client.findFirst({
        where: { id: clientId, companyId: user.companyId },
      });

      if (!existingClient) {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 }
        );
      }

      // Get first address for existing client
      const address = await prisma.address.findFirst({
        where: { clientId },
      });

      if (address) {
        addressId = address.id;
      } else {
        return NextResponse.json(
          { error: 'Client has no addresses. Please add an address first.' },
          { status: 400 }
        );
      }
    }

    if (!finalClientId || !addressId) {
      return NextResponse.json(
        { error: 'Client and address are required' },
        { status: 400 }
      );
    }

    // Generate estimate token
    const estimateToken = crypto.randomBytes(16).toString('hex');

    // Determine service type enum value
    let serviceTypeEnum: 'STANDARD' | 'DEEP' | 'MOVE_OUT' = 'STANDARD';
    if (serviceType.includes('DEEP')) {
      serviceTypeEnum = 'DEEP';
    } else if (serviceType.includes('MOVE')) {
      serviceTypeEnum = 'MOVE_OUT';
    }

    // Create booking with estimate details
    const booking = await prisma.booking.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        clientId: finalClientId,
        addressId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
        duration: Math.round(duration),
        serviceType: serviceTypeEnum,
        status: 'SCHEDULED',
        price: Math.round(price * 100) / 100,
        notes: customerNotes || null,
        internalNotes: JSON.stringify({
          internal: internalNotes,
          provider: providerNotes,
          serviceType,
          sqftRange,
          bedrooms,
          bathrooms,
          serviceAreas,
          addons,
          priority,
          excludeCancellationFee,
          excludeCustomerNotification,
          excludeProviderNotification,
        }),
        estimateToken,
        estimateAccepted: false,
      },
      include: {
        client: true,
        address: true,
      },
    });

    // Generate estimate URL
    const baseUrl = process.env.NEXTAUTH_URL || `https://${request.headers.get('host')}`;
    const estimateUrl = `${baseUrl}/estimate/${estimateToken}`;

    return NextResponse.json({
      success: true,
      data: {
        booking,
        estimateUrl,
      },
      message: 'Estimate created successfully',
    });
  } catch (error) {
    console.error('POST /api/estimates error:', error);

    // Handle Zod validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      console.error('🔴 Validation errors:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      );
    }

    // Handle specific known errors
    if (error instanceof Error && error.message) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { success: false, error: 'A client with this email or phone already exists' },
          { status: 400 }
        );
      }

      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { success: false, error: 'Invalid reference - please check client or address selection' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create estimate' },
      { status: 500 }
    );
  }
}

// GET /api/estimates - List all estimates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all bookings with estimate tokens (quotes)
    const estimates = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        estimateToken: { not: null },
      },
      include: {
        client: true,
        address: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: estimates,
    });
  } catch (error) {
    console.error('GET /api/estimates error:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to fetch estimates' },
      { status: 500 }
    );
  }
}
