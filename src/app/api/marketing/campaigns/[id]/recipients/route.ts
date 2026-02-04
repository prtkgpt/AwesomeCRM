import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/marketing/campaigns/[id]/recipients - Get campaign recipient list
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

    // Verify campaign belongs to company
    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, companyId: user.companyId },
      select: { id: true },
    });

    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    const recipients = await prisma.campaignRecipient.findMany({
      where: { campaignId: params.id },
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true, tags: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, data: recipients });
  } catch (error) {
    console.error('GET /api/marketing/campaigns/[id]/recipients error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch recipients' }, { status: 500 });
  }
}
