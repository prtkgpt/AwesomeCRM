// ============================================
// CleanDayCRM - Promotion Validation API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const validateSchema = z.object({
  code: z.string().min(1),
  serviceId: z.string().cuid().optional(),
  orderValue: z.number().positive(),
  clientId: z.string().cuid().optional(),
});

// POST /api/promotions/validate - Validate a promotion code
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { code, serviceId, orderValue, clientId } = validation.data;
    const now = new Date();

    // Find promotion
    const promotion = await prisma.promotion.findFirst({
      where: {
        companyId: user.companyId,
        code: code.toUpperCase(),
      },
      include: {
        _count: { select: { usages: true } },
      },
    });

    if (!promotion) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'Invalid promotion code',
      });
    }

    // Check if active
    if (!promotion.isActive) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'This promotion is no longer active',
      });
    }

    // Check date validity
    if (promotion.validFrom > now) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'This promotion has not started yet',
      });
    }

    if (promotion.validTo < now) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'This promotion has expired',
      });
    }

    // Check minimum order value
    if (orderValue < promotion.minOrderValue) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: `Minimum order value is $${promotion.minOrderValue.toFixed(2)}`,
      });
    }

    // Check usage limit
    if (promotion.usageLimit && promotion._count.usages >= promotion.usageLimit) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'This promotion has reached its usage limit',
      });
    }

    // Check per-user usage limit
    if (clientId) {
      const userUsages = await prisma.promotionUsage.count({
        where: {
          promotionId: promotion.id,
          clientId,
        },
      });

      if (userUsages >= promotion.usageLimitPerUser) {
        return NextResponse.json({
          success: false,
          valid: false,
          error: 'You have already used this promotion',
        });
      }
    }

    // Check first-time customer restriction
    if (promotion.isFirstTimeOnly && clientId) {
      const previousBookings = await prisma.booking.count({
        where: {
          clientId,
          status: 'COMPLETED',
        },
      });

      if (previousBookings > 0) {
        return NextResponse.json({
          success: false,
          valid: false,
          error: 'This promotion is for first-time customers only',
        });
      }
    }

    // Check applicable services
    if (serviceId && promotion.applicableServices && promotion.applicableServices.length > 0) {
      if (!promotion.applicableServices.includes(serviceId)) {
        return NextResponse.json({
          success: false,
          valid: false,
          error: 'This promotion is not applicable to the selected service',
        });
      }
    }

    // Check client tier
    if (clientId && promotion.applicableClientTiers && promotion.applicableClientTiers.length > 0) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { loyaltyTier: true },
      });

      if (client && !promotion.applicableClientTiers.includes(client.loyaltyTier)) {
        return NextResponse.json({
          success: false,
          valid: false,
          error: 'This promotion is not available for your loyalty tier',
        });
      }
    }

    // Calculate discount
    let discountAmount = 0;

    switch (promotion.type) {
      case 'PERCENTAGE':
        discountAmount = orderValue * (promotion.value / 100);
        break;
      case 'FIXED_AMOUNT':
        discountAmount = promotion.value;
        break;
      case 'FREE_SERVICE':
        // Value is the free service price
        discountAmount = promotion.value;
        break;
      case 'BUY_ONE_GET_ONE':
        // Assume value is the percentage off the second item
        discountAmount = orderValue * 0.5 * (promotion.value / 100);
        break;
    }

    // Apply max discount cap
    if (promotion.maxDiscount && discountAmount > promotion.maxDiscount) {
      discountAmount = promotion.maxDiscount;
    }

    // Ensure discount doesn't exceed order value
    discountAmount = Math.min(discountAmount, orderValue);

    return NextResponse.json({
      success: true,
      valid: true,
      promotion: {
        id: promotion.id,
        code: promotion.code,
        name: promotion.name,
        type: promotion.type,
        value: promotion.value,
      },
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalPrice: Math.round((orderValue - discountAmount) * 100) / 100,
    });
  } catch (error) {
    console.error('POST /api/promotions/validate error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate promotion' },
      { status: 500 }
    );
  }
}
