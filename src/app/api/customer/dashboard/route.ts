import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/customer/dashboard - Get customer dashboard stats
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true },
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
        email: session.user.email,
        companyId: user.companyId,
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 });
    }

    const now = new Date();

    // Get stats
    const [upcomingBookings, completedBookings, totalSpentResult, pendingInvoices] =
      await Promise.all([
        // Upcoming bookings count
        prisma.booking.count({
          where: {
            clientId: client.id,
            scheduledDate: { gte: now },
            status: 'SCHEDULED',
          },
        }),

        // Completed bookings count
        prisma.booking.count({
          where: {
            clientId: client.id,
            status: 'COMPLETED',
          },
        }),

        // Total spent
        prisma.booking.aggregate({
          where: {
            clientId: client.id,
            status: 'COMPLETED',
            isPaid: true,
          },
          _sum: {
            price: true,
          },
        }),

        // Pending invoices count
        prisma.invoice.count({
          where: {
            clientId: client.id,
            status: { notIn: ['PAID'] },
          },
        }),
      ]);

    // Get upcoming bookings list (next 3)
    const upcomingBookingsList = await prisma.booking.findMany({
      where: {
        clientId: client.id,
        scheduledDate: { gte: now },
        status: 'SCHEDULED',
      },
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
        scheduledDate: 'asc',
      },
      take: 3,
    });

    return NextResponse.json({
      success: true,
      stats: {
        upcomingBookings,
        completedBookings,
        totalSpent: totalSpentResult._sum.price || 0,
        pendingInvoices,
      },
      upcomingBookings: upcomingBookingsList,
    });
  } catch (error) {
    console.error('GET /api/customer/dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
