import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/marketing/retention - Dormant client stats and retention data
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

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Total clients
    const totalClients = await prisma.client.count({
      where: { companyId: user.companyId },
    });

    // Active: booked in last 30 days
    const activeClients = await prisma.client.count({
      where: {
        companyId: user.companyId,
        bookings: { some: { scheduledDate: { gte: thirtyDaysAgo } } },
      },
    });

    // At risk: last booking 30-60 days ago
    const atRiskClients = await prisma.client.findMany({
      where: {
        companyId: user.companyId,
        bookings: {
          some: { scheduledDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
          none: { scheduledDate: { gte: thirtyDaysAgo } },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tags: true,
        bookings: {
          orderBy: { scheduledDate: 'desc' },
          take: 1,
          select: { scheduledDate: true, price: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Dormant: last booking 60-90 days ago
    const dormantClients = await prisma.client.findMany({
      where: {
        companyId: user.companyId,
        bookings: {
          some: { scheduledDate: { gte: ninetyDaysAgo, lt: sixtyDaysAgo } },
          none: { scheduledDate: { gte: sixtyDaysAgo } },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tags: true,
        bookings: {
          orderBy: { scheduledDate: 'desc' },
          take: 1,
          select: { scheduledDate: true, price: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Lost: no booking in 90+ days
    const lostClients = await prisma.client.findMany({
      where: {
        companyId: user.companyId,
        bookings: {
          some: {},
          none: { scheduledDate: { gte: ninetyDaysAgo } },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tags: true,
        bookings: {
          orderBy: { scheduledDate: 'desc' },
          take: 1,
          select: { scheduledDate: true, price: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Never booked
    const neverBooked = await prisma.client.count({
      where: {
        companyId: user.companyId,
        bookings: { none: {} },
      },
    });

    // Marketing messages sent (last 30 days)
    const recentCampaigns = await prisma.campaign.count({
      where: {
        companyId: user.companyId,
        status: 'SENT',
        sentAt: { gte: thirtyDaysAgo },
      },
    });

    const marketingMessagesSent = await prisma.message.count({
      where: {
        companyId: user.companyId,
        type: { in: ['MARKETING_SMS', 'MARKETING_EMAIL'] },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalClients,
          activeClients,
          atRiskCount: atRiskClients.length,
          dormantCount: dormantClients.length,
          lostCount: lostClients.length,
          neverBooked,
          recentCampaigns,
          marketingMessagesSent,
        },
        atRiskClients,
        dormantClients,
        lostClients,
      },
    });
  } catch (error) {
    console.error('GET /api/marketing/retention error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch retention data' }, { status: 500 });
  }
}
