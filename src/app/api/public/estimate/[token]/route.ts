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
    // Find booking by feedback token (reusing for estimates)
    const booking = await prisma.booking.findFirst({
      where: {
        feedbackToken: params.token,
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
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

    const clientName = booking.client
      ? `${booking.client.firstName || ''} ${booking.client.lastName || ''}`.trim() || 'Customer'
      : 'Customer';

    // Return public-safe estimate data
    return NextResponse.json({
      success: true,
      data: {
        id: booking.id,
        token: booking.feedbackToken,
        clientName,
        clientEmail: booking.client?.email,
        clientPhone: booking.client?.phone,
        serviceType: booking.serviceType,
        scheduledDate: booking.scheduledDate,
        duration: booking.duration,
        price: booking.finalPrice,
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
