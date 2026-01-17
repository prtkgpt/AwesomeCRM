// ============================================
// CleanDayCRM - Gift Card Lookup & Redemption API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const redeemSchema = z.object({
  clientId: z.string().cuid().optional(), // If redeeming for a specific client
});

// GET /api/payments/gift-cards/[code] - Look up gift card by code
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const giftCard = await prisma.giftCard.findFirst({
      where: {
        code: params.code.toUpperCase(),
        companyId: user.companyId,
      },
      include: {
        redeemedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!giftCard) {
      return NextResponse.json({ error: 'Gift card not found' }, { status: 404 });
    }

    const isExpired = giftCard.expiresAt < new Date();
    const isUsable = giftCard.isActive && !isExpired && giftCard.currentBalance > 0;

    return NextResponse.json({
      success: true,
      data: {
        ...giftCard,
        isExpired,
        isUsable,
      },
    });
  } catch (error) {
    console.error('GET /api/payments/gift-cards/[code] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch gift card' },
      { status: 500 }
    );
  }
}

// POST /api/payments/gift-cards/[code] - Redeem gift card to client account
export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = redeemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { clientId } = validation.data;

    // Find gift card
    const giftCard = await prisma.giftCard.findFirst({
      where: {
        code: params.code.toUpperCase(),
        companyId: user.companyId,
      },
    });

    if (!giftCard) {
      return NextResponse.json({ error: 'Gift card not found' }, { status: 404 });
    }

    if (!giftCard.isActive) {
      return NextResponse.json({ error: 'Gift card is not active' }, { status: 400 });
    }

    if (giftCard.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Gift card has expired' }, { status: 400 });
    }

    if (giftCard.currentBalance <= 0) {
      return NextResponse.json({ error: 'Gift card has no remaining balance' }, { status: 400 });
    }

    if (giftCard.redeemedById) {
      return NextResponse.json({ error: 'Gift card has already been redeemed' }, { status: 400 });
    }

    // Determine which client to credit
    let targetClientId = clientId;

    // If user is a CLIENT role, use their associated client record
    if (user.role === 'CLIENT' && !targetClientId) {
      const clientRecord = await prisma.client.findFirst({
        where: { userId: session.user.id, companyId: user.companyId },
      });
      if (clientRecord) {
        targetClientId = clientRecord.id;
      }
    }

    if (!targetClientId) {
      return NextResponse.json(
        { error: 'Client ID required for redemption' },
        { status: 400 }
      );
    }

    // Verify client belongs to same company
    const client = await prisma.client.findFirst({
      where: { id: targetClientId, companyId: user.companyId },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const creditAmount = giftCard.currentBalance;

    // Start transaction
    await prisma.$transaction([
      // Add credits to client
      prisma.client.update({
        where: { id: targetClientId },
        data: { creditBalance: { increment: creditAmount } },
      }),

      // Record credit transaction
      prisma.creditTransaction.create({
        data: {
          clientId: targetClientId,
          amount: creditAmount,
          type: 'GIFT_CARD',
          description: `Redeemed gift card ${giftCard.code}`,
          giftCardId: giftCard.id,
        },
      }),

      // Mark gift card as redeemed
      prisma.giftCard.update({
        where: { id: giftCard.id },
        data: {
          redeemedById: targetClientId,
          redeemedAt: new Date(),
          currentBalance: 0,
          isRedeemed: true,
        },
      }),

      // Record gift card transaction
      prisma.giftCardTransaction.create({
        data: {
          giftCardId: giftCard.id,
          type: 'REDEMPTION',
          amount: creditAmount,
          balanceAfter: 0,
          clientId: targetClientId,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Gift card redeemed! $${creditAmount.toFixed(2)} added to account.`,
      creditAmount,
      clientName: `${client.firstName} ${client.lastName || ''}`.trim(),
    });
  } catch (error) {
    console.error('POST /api/payments/gift-cards/[code] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to redeem gift card' },
      { status: 500 }
    );
  }
}

// PATCH /api/payments/gift-cards/[code] - Update gift card (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { code: string } }
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

    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { isActive, expiresAt } = body;

    const giftCard = await prisma.giftCard.findFirst({
      where: {
        code: params.code.toUpperCase(),
        companyId: user.companyId,
      },
    });

    if (!giftCard) {
      return NextResponse.json({ error: 'Gift card not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (expiresAt) updateData.expiresAt = new Date(expiresAt);

    const updatedGiftCard = await prisma.giftCard.update({
      where: { id: giftCard.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedGiftCard,
    });
  } catch (error) {
    console.error('PATCH /api/payments/gift-cards/[code] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update gift card' },
      { status: 500 }
    );
  }
}
