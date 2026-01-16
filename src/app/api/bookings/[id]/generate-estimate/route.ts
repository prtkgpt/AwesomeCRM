import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/bookings/[id]/generate-estimate - Generate estimate token for sharing
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only OWNER and ADMIN can generate estimates
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find booking
    const booking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Generate unique token if not exists
    let estimateToken = booking.estimateToken;
    if (!estimateToken) {
      estimateToken = crypto.randomBytes(16).toString('hex');

      await prisma.booking.update({
        where: { id: params.id },
        data: { estimateToken },
      });
    }

    // Generate the full URL
    const baseUrl = process.env.NEXTAUTH_URL || `https://${request.headers.get('host')}`;
    const estimateUrl = `${baseUrl}/estimate/${estimateToken}`;

    return NextResponse.json({
      success: true,
      data: {
        token: estimateToken,
        url: estimateUrl,
      },
    });
  } catch (error) {
    console.error('POST /api/bookings/[id]/generate-estimate error:', error);
    return NextResponse.json(
      { error: 'Failed to generate estimate' },
      { status: 500 }
    );
  }
}
