import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface WinBackStep {
  days: number;
  channel: 'SMS' | 'EMAIL' | 'BOTH';
  template: string;
  emailSubject?: string;
  discountPercent: number;
}

const DEFAULT_CONFIG: { steps: WinBackStep[] } = {
  steps: [
    {
      days: 14,
      channel: 'SMS',
      template: 'Hi {{firstName}}, we miss you at {{companyName}}! It\'s been a while since your last cleaning. Book again and enjoy the same great service. Reply BOOK or visit {{bookingLink}}',
      discountPercent: 0,
    },
    {
      days: 30,
      channel: 'BOTH',
      template: 'Hi {{firstName}}, we\'d love to have you back! As a thank you for being a valued customer, enjoy {{discount}}% off your next cleaning. Use code COMEBACK at checkout or reply BOOK.',
      emailSubject: 'We miss you! Here\'s {{discount}}% off your next cleaning',
      discountPercent: 15,
    },
    {
      days: 60,
      channel: 'BOTH',
      template: 'Hi {{firstName}}, it\'s been 2 months! We\'re offering you an exclusive {{discount}}% off any cleaning service. This is our best offer - don\'t miss out! Reply BOOK or call us.',
      emailSubject: 'Last chance: {{discount}}% off - we want you back!',
      discountPercent: 25,
    },
  ],
};

// GET /api/marketing/winback - Get win-back config and stats
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        winBackEnabled: true,
        winBackConfig: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Get stats
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalAttempts, converted, last30Attempts, last30Converted, revenueRecovered] = await Promise.all([
      prisma.winBackAttempt.count({
        where: { companyId: user.companyId },
      }),
      prisma.winBackAttempt.count({
        where: { companyId: user.companyId, result: 'CONVERTED' },
      }),
      prisma.winBackAttempt.count({
        where: { companyId: user.companyId, sentAt: { gte: thirtyDaysAgo } },
      }),
      prisma.winBackAttempt.count({
        where: { companyId: user.companyId, result: 'CONVERTED', convertedAt: { gte: thirtyDaysAgo } },
      }),
      prisma.winBackAttempt.aggregate({
        where: { companyId: user.companyId, result: 'CONVERTED' },
        _sum: { convertedRevenue: true },
      }),
    ]);

    // Get recent attempts
    const recentAttempts = await prisma.winBackAttempt.findMany({
      where: { companyId: user.companyId },
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { sentAt: 'desc' },
      take: 20,
    });

    // Count eligible clients (haven't booked in 14+ days, no active win-back)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const eligibleClients = await prisma.client.count({
      where: {
        companyId: user.companyId,
        bookings: {
          every: {
            scheduledDate: { lt: fourteenDaysAgo },
          },
          some: {}, // Must have at least one booking
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        enabled: company.winBackEnabled,
        config: (company.winBackConfig as any) || DEFAULT_CONFIG,
        stats: {
          totalAttempts,
          totalConverted: converted,
          conversionRate: totalAttempts > 0 ? Math.round((converted / totalAttempts) * 100) : 0,
          last30DaysAttempts: last30Attempts,
          last30DaysConverted: last30Converted,
          revenueRecovered: revenueRecovered._sum.convertedRevenue || 0,
          eligibleClients,
        },
        recentAttempts: recentAttempts.map((a) => ({
          id: a.id,
          client: a.client,
          step: a.step,
          channel: a.channel,
          discountPercent: a.discountPercent,
          result: a.result,
          sentAt: a.sentAt,
          convertedAt: a.convertedAt,
          convertedRevenue: a.convertedRevenue,
        })),
      },
    });
  } catch (error) {
    console.error('GET /api/marketing/winback error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch win-back data' },
      { status: 500 }
    );
  }
}

// PUT /api/marketing/winback - Update win-back config
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { enabled, config } = body;

    // Validate config structure
    if (config) {
      if (!config.steps || !Array.isArray(config.steps) || config.steps.length === 0) {
        return NextResponse.json(
          { error: 'Config must have at least one step' },
          { status: 400 }
        );
      }

      for (const step of config.steps) {
        if (!step.days || step.days < 1) {
          return NextResponse.json(
            { error: 'Each step must have days > 0' },
            { status: 400 }
          );
        }
        if (!['SMS', 'EMAIL', 'BOTH'].includes(step.channel)) {
          return NextResponse.json(
            { error: 'Channel must be SMS, EMAIL, or BOTH' },
            { status: 400 }
          );
        }
        if (!step.template || step.template.trim().length === 0) {
          return NextResponse.json(
            { error: 'Each step must have a message template' },
            { status: 400 }
          );
        }
      }

      // Ensure steps are in ascending order by days
      config.steps.sort((a: WinBackStep, b: WinBackStep) => a.days - b.days);
    }

    const updateData: any = {};
    if (typeof enabled === 'boolean') updateData.winBackEnabled = enabled;
    if (config) updateData.winBackConfig = config;

    await prisma.company.update({
      where: { id: user.companyId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: enabled ? 'Win-back automation enabled' : config ? 'Win-back configuration updated' : 'Win-back automation disabled',
    });
  } catch (error) {
    console.error('PUT /api/marketing/winback error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update win-back config' },
      { status: 500 }
    );
  }
}
