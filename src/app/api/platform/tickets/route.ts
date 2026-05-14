import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/platform/tickets - List all tickets with filters (platform admin)
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;

    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const companyId = searchParams.get('companyId');

    const whereClause: any = {};
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (companyId) whereClause.companyId = companyId;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where: whereClause,
        orderBy: [
          { priority: 'asc' }, // urgent sorts first alphabetically (but we use raw ordering below)
          { createdAt: 'desc' },
        ],
        include: {
          user: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
        skip,
        take: limit,
      }),
      prisma.supportTicket.count({ where: whereClause }),
    ]);

    // Re-sort: urgent first, then high, normal, low; within same priority, newest first
    const priorityOrder: Record<string, number> = {
      urgent: 0,
      high: 1,
      normal: 2,
      low: 3,
    };

    tickets.sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 99;
      const pb = priorityOrder[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return NextResponse.json({
      success: true,
      data: {
        tickets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Platform: tickets list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

// POST /api/platform/tickets - Create ticket on behalf of a company (admin-created)
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
    const { subject, message, priority, companyId, userId } = body;

    if (!subject || !message || !companyId || !userId) {
      return NextResponse.json(
        { success: false, error: 'subject, message, companyId, and userId are required' },
        { status: 400 }
      );
    }

    // Look up company name
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        subject,
        message,
        priority: priority || 'normal',
        companyId,
        companyName: company.name,
        userId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error('Platform: ticket create error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create ticket' },
      { status: 500 }
    );
  }
}
