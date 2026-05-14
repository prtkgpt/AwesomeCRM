import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Helper: verify platform admin
async function verifyPlatformAdmin(session: any) {
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPlatformAdmin: true },
  });
  return user?.isPlatformAdmin === true;
}

// GET /api/platform/funnel - Onboarding conversion funnel data
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await verifyPlatformAdmin(session))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const now = new Date();
    const funnel = [];

    // Last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

      const monthLabel = monthStart.toISOString().slice(0, 7); // "YYYY-MM"

      // Companies created this month
      const companiesThisMonth = await prisma.company.findMany({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
        },
        select: {
          id: true,
          plan: true,
          _count: {
            select: {
              clients: true,
              bookings: true,
              invoices: true,
            },
          },
        },
      });

      const signups = companiesThisMonth.length;

      // Companies that added at least one client
      const withFirstClient = companiesThisMonth.filter(
        (c) => c._count.clients > 0
      ).length;

      // Companies that created at least one booking
      const withFirstBooking = companiesThisMonth.filter(
        (c) => c._count.bookings > 0
      ).length;

      // Companies that created at least one invoice (proxy for first payment)
      const withFirstPayment = companiesThisMonth.filter(
        (c) => c._count.invoices > 0
      ).length;

      // Companies that upgraded from FREE to a paid plan
      const convertedToPaid = companiesThisMonth.filter(
        (c) => c.plan !== 'FREE'
      ).length;

      funnel.push({
        month: monthLabel,
        signups,
        withFirstClient,
        withFirstBooking,
        withFirstPayment,
        convertedToPaid,
      });
    }

    return NextResponse.json({
      success: true,
      data: funnel,
    });
  } catch (error) {
    console.error('Platform funnel: error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch funnel data' },
      { status: 500 }
    );
  }
}
