import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/public/estimate/[token] - Get public estimate details
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    // Find booking by estimate token
    const booking = await prisma.booking.findFirst({
      where: {
        estimateToken: params.token,
      },
      include: {
        client: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        address: {
          select: {
            street: true,
            city: true,
            state: true,
            zip: true,
          },
        },
        company: {
          select: {
            name: true,
            email: true,
            phone: true,
            logo: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Estimate not found' },
        { status: 404 }
      );
    }

    // Return public-safe estimate data
    return NextResponse.json({
      success: true,
      data: {
        id: booking.id,
        token: booking.estimateToken,
        clientName: booking.client.name,
        clientEmail: booking.client.email,
        clientPhone: booking.client.phone,
        serviceType: booking.serviceType,
        scheduledDate: booking.scheduledDate,
        duration: booking.duration,
        price: booking.price,
        notes: booking.notes,
        status: booking.status,
        address: booking.address,
        company: booking.company,
      },
    });
  } catch (error) {
    console.error('GET /api/public/estimate/[token] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch estimate' },
      { status: 500 }
    );
  }
}
