import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Type assertion for new fields (pre-migration compatibility)
const db = prisma as any;

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/invoices/overdue - Get all overdue invoices with aging report
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user || !user.companyId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can view overdue invoices
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all unpaid invoices that are past due
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        companyId: user.companyId,
        status: { in: ['SENT', 'OVERDUE'] },
        dueDate: { lt: today },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Update status to OVERDUE for any SENT invoices that are past due
    const invoicesToUpdate = overdueInvoices.filter(inv => inv.status === 'SENT');
    if (invoicesToUpdate.length > 0) {
      await prisma.invoice.updateMany({
        where: {
          id: { in: invoicesToUpdate.map(inv => inv.id) },
          status: 'SENT',
        },
        data: { status: 'OVERDUE' },
      });
    }

    // Calculate aging buckets
    const aging = {
      '1-7': { count: 0, total: 0, invoices: [] as any[] },
      '8-14': { count: 0, total: 0, invoices: [] as any[] },
      '15-30': { count: 0, total: 0, invoices: [] as any[] },
      '31-60': { count: 0, total: 0, invoices: [] as any[] },
      '60+': { count: 0, total: 0, invoices: [] as any[] },
    };

    let totalOverdue = 0;

    overdueInvoices.forEach(invoice => {
      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      const invoiceWithDays = {
        ...invoice,
        daysOverdue,
        status: 'OVERDUE', // Reflect updated status
      };

      totalOverdue += invoice.total;

      if (daysOverdue <= 7) {
        aging['1-7'].count++;
        aging['1-7'].total += invoice.total;
        aging['1-7'].invoices.push(invoiceWithDays);
      } else if (daysOverdue <= 14) {
        aging['8-14'].count++;
        aging['8-14'].total += invoice.total;
        aging['8-14'].invoices.push(invoiceWithDays);
      } else if (daysOverdue <= 30) {
        aging['15-30'].count++;
        aging['15-30'].total += invoice.total;
        aging['15-30'].invoices.push(invoiceWithDays);
      } else if (daysOverdue <= 60) {
        aging['31-60'].count++;
        aging['31-60'].total += invoice.total;
        aging['31-60'].invoices.push(invoiceWithDays);
      } else {
        aging['60+'].count++;
        aging['60+'].total += invoice.total;
        aging['60+'].invoices.push(invoiceWithDays);
      }
    });

    // Get invoices due soon (within next 7 days) for proactive reminders
    const dueSoon = await prisma.invoice.findMany({
      where: {
        companyId: user.companyId,
        status: { in: ['SENT', 'DRAFT'] },
        dueDate: {
          gte: today,
          lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalOverdue,
          overdueCount: overdueInvoices.length,
          dueSoonCount: dueSoon.length,
          dueSoonTotal: dueSoon.reduce((sum, inv) => sum + inv.total, 0),
        },
        aging,
        dueSoon: dueSoon.map(inv => ({
          ...inv,
          daysUntilDue: Math.ceil((new Date(inv.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
        })),
      },
    });
  } catch (error: any) {
    console.error('GET /api/invoices/overdue error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch overdue invoices' },
      { status: 500 }
    );
  }
}

// POST /api/invoices/overdue - Send batch reminders for overdue invoices
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { minDaysOverdue = 3, maxDaysOverdue, channel = 'EMAIL' } = body;

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user || !user.companyId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER can send batch reminders
    if (user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only owners can send batch reminders' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate date range for filtering
    const minDate = new Date(today.getTime() - (maxDaysOverdue || 365) * 24 * 60 * 60 * 1000);
    const maxDate = new Date(today.getTime() - minDaysOverdue * 24 * 60 * 60 * 1000);

    // Get overdue invoices that haven't had a reminder in the last 3 days
    const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);

    // Using db for pre-migration compatibility with lastReminderAt field
    const invoicesToRemind = await db.invoice.findMany({
      where: {
        companyId: user.companyId,
        status: { in: ['SENT', 'OVERDUE'] },
        dueDate: {
          gte: minDate,
          lt: maxDate,
        },
        OR: [
          { lastReminderAt: null },
          { lastReminderAt: { lt: threeDaysAgo } },
        ],
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Return list of invoices that would be reminded (dry run info)
    return NextResponse.json({
      success: true,
      data: {
        count: invoicesToRemind.length,
        totalAmount: invoicesToRemind.reduce((sum: number, inv: any) => sum + inv.total, 0),
        invoices: invoicesToRemind.map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          clientName: inv.client.name,
          clientEmail: inv.client.email,
          clientPhone: inv.client.phone,
          total: inv.total,
          dueDate: inv.dueDate,
          daysOverdue: Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
          lastReminderAt: inv.lastReminderAt,
          reminderCount: inv.reminderCount,
        })),
        message: `Found ${invoicesToRemind.length} invoices eligible for reminders. Use individual send-reminder endpoint to send.`,
      },
    });
  } catch (error: any) {
    console.error('POST /api/invoices/overdue error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process batch reminders' },
      { status: 500 }
    );
  }
}
