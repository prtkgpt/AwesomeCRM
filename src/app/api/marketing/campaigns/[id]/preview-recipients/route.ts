import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/marketing/campaigns/[id]/preview-recipients - Preview who would receive a draft campaign
export async function GET(
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
      select: { companyId: true, role: true },
    });

    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, companyId: user.companyId },
    });

    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    // Build audience from segment filter (same logic as send)
    const filter = (campaign.segmentFilter as any) || {};
    const whereClause: any = {
      companyId: user.companyId,
      marketingOptOut: { not: true },
    };

    if (filter.tags && filter.tags.length > 0) {
      whereClause.tags = { hasSome: filter.tags };
    }
    if (filter.noBookingDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - filter.noBookingDays);
      whereClause.bookings = {
        none: { scheduledDate: { gte: cutoff } },
      };
    }

    // Filter by channel capability
    if (campaign.channel === 'SMS') {
      whereClause.phone = { not: null };
    } else if (campaign.channel === 'EMAIL') {
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

    // Also get count of clients who ARE opted out (for info display)
    const optedOutCount = await prisma.client.count({
      where: {
        companyId: user.companyId,
        marketingOptOut: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { recipients, optedOutCount },
    });
  } catch (error) {
    console.error('GET /api/marketing/campaigns/[id]/preview-recipients error:', error);
    return NextResponse.json({ success: false, error: 'Failed to preview recipients' }, { status: 500 });
  }
}
