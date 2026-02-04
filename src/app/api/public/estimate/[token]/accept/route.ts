import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/public/estimate/[token]/accept - Accept estimate (mark as accepted)
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    // Find booking by estimate token
    const booking = await prisma.booking.findFirst({
      where: {
        estimateToken: params.token,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Estimate not found' },
        { status: 404 }
      );
    }

    // Check if already accepted
    if (booking.estimateAccepted) {
      return NextResponse.json(
        { error: 'Estimate has already been accepted' },
        { status: 400 }
      );
    }

    // Mark estimate as accepted
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        estimateAccepted: true,
        estimateAcceptedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Estimate accepted successfully',
    });
  } catch (error) {
    console.error('POST /api/public/estimate/[token]/accept error:', error);
    return NextResponse.json(
      { error: 'Failed to accept estimate' },
      { status: 500 }
    );
  }
}
