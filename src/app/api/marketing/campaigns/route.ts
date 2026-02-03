import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/marketing/campaigns - List all campaigns
export async function GET(request: NextRequest) {
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

    const campaigns = await prisma.campaign.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        _count: { select: { recipients: true } },
      },
    });

    return NextResponse.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('GET /api/marketing/campaigns error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

// POST /api/marketing/campaigns - Create a campaign
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
    const { name, channel, subject, body: messageBody, segmentFilter, scheduledFor } = body;

    if (!name || !messageBody) {
      return NextResponse.json(
        { success: false, error: 'Name and message body are required' },
        { status: 400 }
      );
    }

    if ((channel === 'EMAIL' || channel === 'BOTH') && !subject) {
      return NextResponse.json(
        { success: false, error: 'Email subject is required for email campaigns' },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        companyId: user.companyId,
        userId: session.user.id,
        name,
        channel: channel || 'SMS',
        subject: subject || null,
        body: messageBody,
        segmentFilter: segmentFilter || null,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      },
    });

    return NextResponse.json({ success: true, data: campaign }, { status: 201 });
  } catch (error) {
    console.error('POST /api/marketing/campaigns error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create campaign' }, { status: 500 });
  }
}
