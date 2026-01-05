import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/customer/bookings - Get customer's bookings
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

    // Only customers can access this endpoint
    if (user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get customer's client record
    const client = await prisma.client.findFirst({
      where: {
        email: user.email,
        companyId: user.companyId,
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';

    const now = new Date();
    let where: any = { clientId: client.id };

    if (filter === 'upcoming') {
      where.scheduledDate = { gte: now };
      where.status = 'SCHEDULED';
    } else if (filter === 'completed') {
      where.status = 'COMPLETED';
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        address: {
          select: {
            street: true,
            city: true,
            state: true,
            zip: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error('GET /api/customer/bookings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
