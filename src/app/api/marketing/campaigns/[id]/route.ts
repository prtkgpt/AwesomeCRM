import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/marketing/campaigns/[id] - Get campaign details
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
      include: { user: { select: { name: true } } },
    });

    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error('GET /api/marketing/campaigns/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch campaign' }, { status: 500 });
  }
}

// PUT /api/marketing/campaigns/[id] - Update a campaign
export async function PUT(
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

    const existing = await prisma.campaign.findFirst({
      where: { id: params.id, companyId: user.companyId },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, error: 'Only draft campaigns can be edited' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, channel, subject, body: messageBody, segmentFilter, scheduledFor } = body;

    const campaign = await prisma.campaign.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(channel && { channel }),
        ...(subject !== undefined && { subject }),
        ...(messageBody && { body: messageBody }),
        ...(segmentFilter !== undefined && { segmentFilter }),
        ...(scheduledFor !== undefined && { scheduledFor: scheduledFor ? new Date(scheduledFor) : null }),
      },
    });

    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error('PUT /api/marketing/campaigns/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update campaign' }, { status: 500 });
  }
}

// DELETE /api/marketing/campaigns/[id] - Delete a campaign
export async function DELETE(
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

    const existing = await prisma.campaign.findFirst({
      where: { id: params.id, companyId: user.companyId },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    if (existing.status === 'SENDING') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete a campaign that is currently sending' },
        { status: 400 }
      );
    }

    await prisma.campaign.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    console.error('DELETE /api/marketing/campaigns/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete campaign' }, { status: 500 });
  }
}
