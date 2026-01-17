import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateClientSchema } from '@/lib/validations';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/clients/[id] - Get client details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const client = await prisma.client.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
      include: {
        addresses: true,
        bookings: {
          include: {
            address: true,
          },
          orderBy: {
            scheduledDate: 'desc',
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    // Add computed name field
    const clientWithName = {
      ...client,
      name: `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Unnamed Client',
    };

    return NextResponse.json({ success: true, data: clientWithName });
  } catch (error) {
    console.error('GET /api/clients/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}

// PUT /api/clients/[id] - Update client
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateClientSchema.parse(body);

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify ownership
    const existingClient = await prisma.client.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    // Update client and address
    const result = await prisma.$transaction(async (tx) => {
      // Update client
      const client = await tx.client.update({
        where: { id: params.id },
        data: {
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          email: validatedData.email || null,
          phone: validatedData.phone,
          tags: validatedData.tags,
          notes: validatedData.notes,
          // Insurance fields
          hasInsurance: body.hasInsurance,
          insuranceProvider: body.insuranceProvider,
          insuranceMemberId: body.insuranceMemberId,
          insurancePaymentAmount: body.insurancePaymentAmount,
          standardCopay: body.standardCopay,
          discountedCopay: body.discountedCopay,
          copayNotes: body.copayNotes,
        },
      });

      // Update primary address if provided
      if (body.addressId && body.address) {
        await tx.address.update({
          where: { id: body.addressId },
          data: {
            street: body.address.street,
            city: body.address.city,
            state: body.address.state,
            zip: body.address.zip,
            googlePlaceId: body.address.googlePlaceId,
            lat: body.address.lat,
            lng: body.address.lng,
            formattedAddress: body.address.formattedAddress,
            isVerified: body.address.isVerified,
            parkingInfo: body.address.parkingInfo,
            gateCode: body.address.gateCode,
            alarmCode: body.address.alarmCode,
            keyLocation: body.address.keyLocation,
            entryInstructions: body.address.entryInstructions,
            hasPets: body.address.hasPets,
            petDetails: body.address.petDetails,
            petInstructions: body.address.petInstructions,
            cleanerNotes: body.address.cleanerNotes,
            propertyType: body.address.propertyType,
            squareFootage: body.address.squareFootage,
            bedrooms: body.address.bedrooms,
            bathrooms: body.address.bathrooms,
            floors: body.address.floors,
            yearBuilt: body.address.yearBuilt,
          },
        });
      }

      // Fetch updated client with addresses
      return await tx.client.findUnique({
        where: { id: params.id },
        include: { addresses: true },
      });
    });

    // Add computed name field
    const resultWithName = result ? {
      ...result,
      name: `${result.firstName || ''} ${result.lastName || ''}`.trim() || 'Unnamed Client',
    } : null;

    return NextResponse.json({
      success: true,
      data: resultWithName,
      message: 'Client updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/clients/[id] error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

// PATCH /api/clients/[id] - Partial update client (e.g., notes only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify ownership
    const existingClient = await prisma.client.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    // Build update data object with only provided fields
    const updateData: any = {};
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.firstName !== undefined) updateData.firstName = body.firstName;
    if (body.lastName !== undefined) updateData.lastName = body.lastName;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.tags !== undefined) updateData.tags = body.tags;

    // Update client
    const client = await prisma.client.update({
      where: { id: params.id },
      data: updateData,
      include: {
        addresses: true,
      },
    });

    // Add computed name field
    const clientWithName = {
      ...client,
      name: `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Unnamed Client',
    };

    return NextResponse.json({
      success: true,
      data: clientWithName,
      message: 'Client updated successfully',
    });
  } catch (error) {
    console.error('PATCH /api/clients/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[id] - Delete client
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify ownership - use companyId for multi-tenant isolation
    const existingClient = await prisma.client.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    // Delete client (cascade will delete addresses and bookings)
    await prisma.client.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/clients/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}
