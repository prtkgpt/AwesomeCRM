import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET - Fetch customer's own profile
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the client record for this customer user with addresses
    const client = await prisma.client.findFirst({
      where: { customerUserId: session.user.id },
      include: {
        addresses: {
          orderBy: { createdAt: 'asc' }
        }
      },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PATCH - Update customer's own profile
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the client record for this customer user
    const client = await prisma.client.findFirst({
      where: { customerUserId: session.user.id },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client profile not found' },
        { status: 404 }
      );
    }

    const body = await req.json();

    // Only allow updating specific fields
    const { name, email, phone } = body;

    const updatedClient = await prisma.client.update({
      where: { id: client.id },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
      },
      include: {
        addresses: true
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedClient,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Error updating customer profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
