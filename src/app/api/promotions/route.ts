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
  discountType: z.enum(['PERCENT', 'FIXED', 'FREE_ADDON']),
  discountValue: z.number().positive(),
  minOrderAmount: z.number().min(0).optional(),
  maxDiscount: z.number().positive().optional(),
  maxUsageCount: z.number().int().positive().optional(), // Total uses
  maxUsagePerUser: z.number().int().positive().optional(),
  startsAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  serviceTypes: z.array(z.string()).optional(),
  newCustomersOnly: z.boolean().default(false),
  firstBookingOnly: z.boolean().default(false),
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
      where.startsAt = { lte: now };
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gte: now } },
      ];
    } else if (status === 'expired') {
      where.expiresAt = { lt: now };
    } else if (status === 'upcoming') {
      where.startsAt = { gt: now };
    }

    if (type) where.discountType = type;

    const [promotions, total, totalActive] = await Promise.all([
      prisma.promotion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.promotion.count({ where }),
      prisma.promotion.count({
        where: {
          companyId: user.companyId,
          isActive: true,
          startsAt: { lte: now },
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: now } },
          ],
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: promotions.map(p => ({
        ...p,
        usageCount: p.currentUsage,
        isExpired: p.expiresAt ? p.expiresAt < now : false,
        isUpcoming: p.startsAt > now,
      })),
      stats: {
        totalActive,
        totalUsages: 0,
        totalSavings: 0,
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

    const { startsAt, expiresAt, ...promotionData } = validation.data;

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
        startsAt: new Date(startsAt),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
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
