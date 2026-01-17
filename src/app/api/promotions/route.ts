// ============================================
// CleanDayCRM - Promotions API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, generateToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createPromotionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  code: z.string().min(3).max(20).regex(/^[A-Z0-9-]+$/).optional(), // Auto-generate if not provided
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SERVICE', 'BUY_ONE_GET_ONE']),
  value: z.number().positive(),
  minOrderValue: z.number().min(0).default(0),
  maxDiscount: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(), // Total uses
  usageLimitPerUser: z.number().int().positive().default(1),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime(),
  applicableServices: z.array(z.string().cuid()).optional(), // Empty = all services
  applicableClientTiers: z.array(z.enum(['BASIC', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'])).optional(),
  isFirstTimeOnly: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// GET /api/promotions - List promotions
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
    const status = searchParams.get('status'); // active, expired, upcoming, all
    const type = searchParams.get('type');

    const now = new Date();
    const where: any = { companyId: user.companyId };

    if (status === 'active') {
      where.isActive = true;
      where.validFrom = { lte: now };
      where.validTo = { gte: now };
    } else if (status === 'expired') {
      where.validTo = { lt: now };
    } else if (status === 'upcoming') {
      where.validFrom = { gt: now };
    }

    if (type) where.type = type;

    const [promotions, total] = await Promise.all([
      prisma.promotion.findMany({
        where,
        include: {
          _count: {
            select: { usages: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.promotion.count({ where }),
    ]);

    // Calculate stats
    const stats = {
      totalActive: await prisma.promotion.count({
        where: {
          companyId: user.companyId,
          isActive: true,
          validFrom: { lte: now },
          validTo: { gte: now },
        },
      }),
      totalUsages: await prisma.promotionUsage.count({
        where: { promotion: { companyId: user.companyId } },
      }),
      totalSavings: await prisma.promotionUsage.aggregate({
        where: { promotion: { companyId: user.companyId } },
        _sum: { discountAmount: true },
      }),
    };

    return NextResponse.json({
      success: true,
      data: promotions.map(p => ({
        ...p,
        usageCount: p._count.usages,
        isExpired: p.validTo < now,
        isUpcoming: p.validFrom > now,
      })),
      stats: {
        ...stats,
        totalSavings: stats.totalSavings._sum.discountAmount || 0,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/promotions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch promotions' },
      { status: 500 }
    );
  }
}

// POST /api/promotions - Create promotion
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
    const validation = createPromotionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { validFrom, validTo, ...promotionData } = validation.data;

    // Generate code if not provided
    const code = promotionData.code || `PROMO-${generateToken(6).toUpperCase()}`;

    // Check code uniqueness
    const existing = await prisma.promotion.findFirst({
      where: { companyId: user.companyId, code },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Promotion code already exists' },
        { status: 400 }
      );
    }

    const promotion = await prisma.promotion.create({
      data: {
        ...promotionData,
        code,
        companyId: user.companyId,
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
        createdById: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: promotion,
    });
  } catch (error) {
    console.error('POST /api/promotions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create promotion' },
      { status: 500 }
    );
  }
}
