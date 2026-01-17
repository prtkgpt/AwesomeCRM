// ============================================
// CleanDayCRM - Gift Cards API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, generateToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { addMonths } from 'date-fns';

export const dynamic = 'force-dynamic';

const createGiftCardSchema = z.object({
  amount: z.number().min(10).max(500),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().min(1).optional(),
  message: z.string().max(500).optional(),
  sendEmail: z.boolean().default(true),
  expiresInMonths: z.number().min(6).max(24).default(12),
});

const purchaseGiftCardSchema = z.object({
  amount: z.number().min(10).max(500),
  recipientEmail: z.string().email(),
  recipientName: z.string().min(1),
  senderName: z.string().min(1),
  message: z.string().max(500).optional(),
  deliveryDate: z.string().datetime().optional(), // Schedule delivery
});

// GET /api/payments/gift-cards - List gift cards
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
    const status = searchParams.get('status'); // active, redeemed, expired

    const where: any = { companyId: user.companyId };

    if (status === 'active') {
      where.isActive = true;
      where.expiresAt = { gt: new Date() };
      where.OR = [
        { currentBalance: { gt: 0 } },
        { isRedeemed: false },
      ];
    } else if (status === 'redeemed') {
      where.isRedeemed = true;
    } else if (status === 'expired') {
      where.expiresAt = { lt: new Date() };
    }

    const [giftCards, total] = await Promise.all([
      prisma.giftCard.findMany({
        where,
        include: {
          purchasedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          redeemedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.giftCard.count({ where }),
    ]);

    // Calculate stats
    const stats = await prisma.giftCard.aggregate({
      where: { companyId: user.companyId },
      _sum: { originalAmount: true, currentBalance: true },
      _count: { id: true },
    });

    const activeCards = await prisma.giftCard.count({
      where: {
        companyId: user.companyId,
        isActive: true,
        expiresAt: { gt: new Date() },
        currentBalance: { gt: 0 },
      },
    });

    return NextResponse.json({
      success: true,
      data: giftCards,
      stats: {
        totalSold: stats._count.id,
        totalValue: stats._sum.originalAmount || 0,
        outstandingBalance: stats._sum.currentBalance || 0,
        activeCards,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/payments/gift-cards error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch gift cards' },
      { status: 500 }
    );
  }
}

// POST /api/payments/gift-cards - Create a gift card (admin creates)
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
    const validation = createGiftCardSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { amount, recipientEmail, recipientName, message, sendEmail, expiresInMonths } = validation.data;

    // Generate unique code
    const code = `GC-${generateToken(8).toUpperCase()}`;

    const giftCard = await prisma.giftCard.create({
      data: {
        companyId: user.companyId,
        code,
        originalAmount: amount,
        currentBalance: amount,
        recipientEmail,
        recipientName,
        message,
        expiresAt: addMonths(new Date(), expiresInMonths),
        createdById: session.user.id,
        isActive: true,
      },
    });

    // Send email if requested
    if (sendEmail && recipientEmail) {
      // TODO: Send gift card email using Resend
      console.log(`Gift card email would be sent to ${recipientEmail}`);
    }

    return NextResponse.json({
      success: true,
      data: giftCard,
    });
  } catch (error) {
    console.error('POST /api/payments/gift-cards error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create gift card' },
      { status: 500 }
    );
  }
}
