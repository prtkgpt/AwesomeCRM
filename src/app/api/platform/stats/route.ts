import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/platform/stats - Platform-wide statistics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isPlatformAdmin: true },
    });

    if (!user?.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const [
      totalCompanies,
      totalUsers,
      totalClients,
      totalBookings,
      recentCompanies,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.user.count(),
      prisma.client.count(),
      prisma.booking.count(),
      prisma.company.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          createdAt: true,
          _count: { select: { users: true, clients: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalCompanies,
        totalUsers,
        totalClients,
        totalBookings,
        recentCompanies,
      },
    });
  } catch (error) {
    console.error('Platform: stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
