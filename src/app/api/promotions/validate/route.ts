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
  serviceType: z.string().optional(),
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

    const { code, serviceType, orderValue, clientId } = validation.data;
    const now = new Date();

    // Find promotion
    const promotion = await prisma.promotion.findFirst({
      where: {
        companyId: user.companyId,
        code: code.toUpperCase(),
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
    if (promotion.startsAt > now) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'This promotion has not started yet',
      });
    }

    if (promotion.expiresAt && promotion.expiresAt < now) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'This promotion has expired',
      });
    }

    // Check minimum order value
    if (promotion.minOrderAmount && orderValue < promotion.minOrderAmount) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: `Minimum order value is $${promotion.minOrderAmount.toFixed(2)}`,
      });
    }

    // Check usage limit
    if (promotion.maxUsageCount && promotion.currentUsage >= promotion.maxUsageCount) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'This promotion has reached its usage limit',
      });
    }

    // Check first-time customer restriction
    if ((promotion.firstBookingOnly || promotion.newCustomersOnly) && clientId) {
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
    if (serviceType && promotion.serviceTypes && promotion.serviceTypes.length > 0) {
      if (!promotion.serviceTypes.includes(serviceType)) {
        return NextResponse.json({
          success: false,
          valid: false,
          error: 'This promotion is not applicable to the selected service',
        });
      }
    }

    // Calculate discount
    let discountAmount = 0;

    switch (promotion.discountType) {
      case 'PERCENT':
        discountAmount = orderValue * (promotion.discountValue / 100);
        break;
      case 'FIXED':
        discountAmount = promotion.discountValue;
        break;
      case 'FREE_ADDON':
        discountAmount = promotion.discountValue;
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
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
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
