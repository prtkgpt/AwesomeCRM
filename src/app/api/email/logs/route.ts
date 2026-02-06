import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { subDays, format } from 'date-fns';

// GET: List email logs for the company
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
    const status = searchParams.get('status');
    const templateId = searchParams.get('templateId');
    const campaignId = searchParams.get('campaignId');
    const days = parseInt(searchParams.get('days') || '30');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const startDate = subDays(new Date(), days);

    const where = {
      companyId: user.companyId,
      createdAt: { gte: startDate },
      ...(status && { status }),
      ...(templateId && { templateId }),
      ...(campaignId && { campaignId }),
    };

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        include: {
          template: {
            select: { name: true, category: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.emailLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List email logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create an email log (typically called by the email service)
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

    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    const log = await prisma.emailLog.create({
      data: {
        companyId: user.companyId,
        templateId: body.templateId,
        campaignId: body.campaignId,
        recipientId: body.recipientId,
        recipientEmail: body.recipientEmail,
        recipientType: body.recipientType,
        subject: body.subject,
        status: body.status || 'QUEUED',
        providerId: body.providerId,
        providerStatus: body.providerStatus,
        metadata: body.metadata,
      },
    });

    return NextResponse.json({
      success: true,
      data: log,
    }, { status: 201 });
  } catch (error) {
    console.error('Create email log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
