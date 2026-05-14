import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// POST /api/platform/bulk-email - Send email to company owners matching criteria
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isPlatformAdmin: true },
    });

    if (!user?.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { subject, htmlBody, targetPlans, targetStatuses } = body;

    if (!subject || !htmlBody) {
      return NextResponse.json(
        { success: false, error: 'subject and htmlBody are required' },
        { status: 400 }
      );
    }

    if (!targetPlans?.length && !targetStatuses?.length) {
      return NextResponse.json(
        { success: false, error: 'At least one of targetPlans or targetStatuses is required' },
        { status: 400 }
      );
    }

    // Build company filter
    const companyWhere: any = {};
    if (targetPlans?.length) {
      companyWhere.plan = { in: targetPlans };
    }
    if (targetStatuses?.length) {
      companyWhere.subscriptionStatus = { in: targetStatuses };
    }

    // Find matching companies
    const companies = await prisma.company.findMany({
      where: companyWhere,
      select: {
        id: true,
        name: true,
        users: {
          where: { role: 'OWNER' },
          select: { id: true, name: true, email: true },
          take: 1,
        },
      },
    });

    let sent = 0;
    let failed = 0;
    const total = companies.length;

    for (const company of companies) {
      const owner = company.users[0];
      if (!owner?.email) {
        failed++;
        continue;
      }

      try {
        await sendEmail({
          to: owner.email,
          subject,
          html: htmlBody,
          from: 'CleanDay CRM <noreply@cleandaycrm.com>',
          type: 'notification',
        });
        sent++;
      } catch (e) {
        console.error(`Failed to send bulk email to ${owner.email}:`, e);
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      data: { sent, failed, total },
    });
  } catch (error) {
    console.error('Platform: bulk-email error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send bulk emails' },
      { status: 500 }
    );
  }
}
