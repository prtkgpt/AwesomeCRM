// ============================================
// CleanDayCRM - Credits Management API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const addCreditsSchema = z.object({
  clientId: z.string().cuid(),
  amount: z.number().positive(),
  reason: z.string().min(1),
  type: z.enum(['COMPENSATION', 'PROMO_CREDIT', 'REFERRAL_EARNED', 'TIER_BONUS', 'LOYALTY_EARNED', 'GIFT_CARD_CREDIT']).default('COMPENSATION'),
});

// GET /api/payments/credits - List credit transactions
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const clientId = searchParams.get('clientId');
    const type = searchParams.get('type');

    const where: any = {
      client: { companyId: user.companyId },
    };

    if (clientId) where.clientId = clientId;
    if (type) where.type = type;

    const [transactions, total] = await Promise.all([
      prisma.creditTransaction.findMany({
        where,
        include: {
          client: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.creditTransaction.count({ where }),
    ]);

    // Calculate totals
    const totals = await prisma.creditTransaction.groupBy({
      by: ['type'],
      where: { client: { companyId: user.companyId } },
      _sum: { amount: true },
    });

    const totalIssued = totals
      .filter(t => (t._sum.amount || 0) > 0)
      .reduce((sum, t) => sum + (t._sum.amount || 0), 0);

    const totalRedeemed = Math.abs(
      totals
        .filter(t => (t._sum.amount || 0) < 0)
        .reduce((sum, t) => sum + (t._sum.amount || 0), 0)
    );

    const totalOutstanding = await prisma.client.aggregate({
      where: { companyId: user.companyId, creditBalance: { gt: 0 } },
      _sum: { creditBalance: true },
    });

    return NextResponse.json({
      success: true,
      data: transactions,
      stats: {
        totalIssued,
        totalRedeemed,
        outstanding: totalOutstanding._sum.creditBalance || 0,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/payments/credits error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch credit transactions' },
      { status: 500 }
    );
  }
}

// POST /api/payments/credits - Manually add credits to client
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
    const validation = addCreditsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { clientId, amount, reason, type } = validation.data;

    // Verify client belongs to company
    const client = await prisma.client.findFirst({
      where: { id: clientId, companyId: user.companyId },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Calculate new balance
    const newBalance = (client.creditBalance || 0) + amount;

    // Add credits
    const [updatedClient, transaction] = await prisma.$transaction([
      prisma.client.update({
        where: { id: clientId },
        data: { creditBalance: newBalance },
      }),
      prisma.creditTransaction.create({
        data: {
          clientId,
          amount,
          balance: newBalance,
          type,
          description: reason,
        },
        include: {
          client: {
            select: { id: true, firstName: true, lastName: true, creditBalance: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: transaction,
      newBalance: updatedClient.creditBalance,
    });
  } catch (error) {
    console.error('POST /api/payments/credits error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add credits' },
      { status: 500 }
    );
  }
}
