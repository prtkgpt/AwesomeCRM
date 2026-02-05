import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { subDays, startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns';

// GET: Email analytics for the company
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

    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    // Get all email logs in the date range
    const logs = await prisma.emailLog.findMany({
      where: {
        companyId: user.companyId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        status: true,
        templateId: true,
        campaignId: true,
        sentAt: true,
        deliveredAt: true,
        openedAt: true,
        clickedAt: true,
        bouncedAt: true,
        failedAt: true,
        createdAt: true,
      },
    });

    // Calculate overall metrics
    const totalSent = logs.filter((l) => ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(l.status)).length;
    const delivered = logs.filter((l) => l.deliveredAt).length;
    const opened = logs.filter((l) => l.openedAt).length;
    const clicked = logs.filter((l) => l.clickedAt).length;
    const bounced = logs.filter((l) => l.bouncedAt || l.status === 'BOUNCED').length;
    const failed = logs.filter((l) => l.failedAt || l.status === 'FAILED').length;

    // Calculate rates
    const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0;
    const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
    const clickRate = opened > 0 ? Math.round((clicked / opened) * 100) : 0;
    const bounceRate = totalSent > 0 ? Math.round((bounced / totalSent) * 100) : 0;

    // Status distribution
    const statusDistribution = {
      QUEUED: logs.filter((l) => l.status === 'QUEUED').length,
      SENT: logs.filter((l) => l.status === 'SENT').length,
      DELIVERED: logs.filter((l) => l.status === 'DELIVERED').length,
      OPENED: logs.filter((l) => l.status === 'OPENED').length,
      CLICKED: logs.filter((l) => l.status === 'CLICKED').length,
      BOUNCED: logs.filter((l) => l.status === 'BOUNCED').length,
      FAILED: logs.filter((l) => l.status === 'FAILED').length,
    };

    // Daily breakdown
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    const dailyStats = dateRange.map((date) => {
      const dayLogs = logs.filter(
        (l) => format(new Date(l.createdAt), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      return {
        date: format(date, 'yyyy-MM-dd'),
        label: format(date, 'MMM d'),
        sent: dayLogs.filter((l) => l.sentAt || ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(l.status)).length,
        delivered: dayLogs.filter((l) => l.deliveredAt).length,
        opened: dayLogs.filter((l) => l.openedAt).length,
        clicked: dayLogs.filter((l) => l.clickedAt).length,
        bounced: dayLogs.filter((l) => l.bouncedAt).length,
        failed: dayLogs.filter((l) => l.failedAt).length,
      };
    });

    // Top performing templates
    const templatePerformance = await prisma.emailLog.groupBy({
      by: ['templateId'],
      where: {
        companyId: user.companyId,
        createdAt: { gte: startDate, lte: endDate },
        templateId: { not: null },
      },
      _count: { id: true },
    });

    // Get template details
    const templateIds = templatePerformance.map((t) => t.templateId).filter((id): id is string => id !== null);
    const templates = await prisma.emailTemplate.findMany({
      where: { id: { in: templateIds } },
      select: { id: true, name: true, category: true },
    });

    const templateStats = await Promise.all(
      templatePerformance.map(async (tp) => {
        const template = templates.find((t) => t.id === tp.templateId);
        const templateLogs = logs.filter((l) => l.templateId === tp.templateId);
        const templateSent = templateLogs.filter((l) =>
          ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(l.status)
        ).length;
        const templateDelivered = templateLogs.filter((l) => l.deliveredAt).length;
        const templateOpened = templateLogs.filter((l) => l.openedAt).length;

        return {
          templateId: tp.templateId,
          templateName: template?.name || 'Unknown',
          category: template?.category || 'Unknown',
          totalSent: templateSent,
          delivered: templateDelivered,
          opened: templateOpened,
          openRate: templateDelivered > 0 ? Math.round((templateOpened / templateDelivered) * 100) : 0,
        };
      })
    );

    // Sort by open rate
    templateStats.sort((a, b) => b.openRate - a.openRate);

    // Campaign performance (if any)
    const campaignPerformance = await prisma.emailLog.groupBy({
      by: ['campaignId'],
      where: {
        companyId: user.companyId,
        createdAt: { gte: startDate, lte: endDate },
        campaignId: { not: null },
      },
      _count: { id: true },
    });

    const campaignStats = campaignPerformance.map((cp) => {
      const campaignLogs = logs.filter((l) => l.campaignId === cp.campaignId);
      const sent = campaignLogs.filter((l) =>
        ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(l.status)
      ).length;
      const campaignDelivered = campaignLogs.filter((l) => l.deliveredAt).length;
      const campaignOpened = campaignLogs.filter((l) => l.openedAt).length;
      const campaignClicked = campaignLogs.filter((l) => l.clickedAt).length;

      return {
        campaignId: cp.campaignId,
        totalSent: sent,
        delivered: campaignDelivered,
        opened: campaignOpened,
        clicked: campaignClicked,
        openRate: campaignDelivered > 0 ? Math.round((campaignOpened / campaignDelivered) * 100) : 0,
        clickRate: campaignOpened > 0 ? Math.round((campaignClicked / campaignOpened) * 100) : 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        period: {
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd'),
          days,
        },
        summary: {
          totalEmails: logs.length,
          sent: totalSent,
          delivered,
          opened,
          clicked,
          bounced,
          failed,
        },
        rates: {
          deliveryRate,
          openRate,
          clickRate,
          bounceRate,
        },
        statusDistribution,
        dailyStats,
        templatePerformance: templateStats.slice(0, 10),
        campaignPerformance: campaignStats.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('Email analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
