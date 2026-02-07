import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST /api/marketing/recipients - Preview audience from filter criteria
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { tags, noBookingDays, channel } = body;

    const whereClause: any = {
      companyId: user.companyId,
      marketingOptOut: { not: true },
    };

    if (tags && tags.length > 0) {
      whereClause.tags = { hasSome: tags };
    }

    if (noBookingDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - noBookingDays);
      whereClause.bookings = {
        none: { scheduledDate: { gte: cutoff } },
      };
    }

    // Filter by contact availability based on channel
    if (channel === 'SMS') {
      whereClause.phone = { not: null };
    } else if (channel === 'EMAIL') {
      whereClause.email = { not: null };
    }

    const recipients = await prisma.client.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tags: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        count: recipients.length,
        recipients,
      },
    });
  } catch (error) {
    console.error('POST /api/marketing/recipients error:', error);
    return NextResponse.json({ success: false, error: 'Failed to preview recipients' }, { status: 500 });
  }
}
