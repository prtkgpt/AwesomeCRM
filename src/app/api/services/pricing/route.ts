// ============================================
// CleanDayCRM - Pricing Rules API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createPricingRuleSchema = z.object({
  serviceId: z.string().cuid().optional(), // If null, applies to all services
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum([
    'SQUARE_FOOTAGE',
    'ROOM_COUNT',
    'BATHROOM_COUNT',
    'FREQUENCY',
    'TIME_OF_DAY',
    'DAY_OF_WEEK',
    'SEASONAL',
    'PROPERTY_TYPE',
    'ADD_ON',
    'DISCOUNT',
    'MINIMUM',
    'EXTRA_DIRTY',
    'PETS',
  ]),
  condition: z.record(z.any()).optional(), // Flexible conditions
  adjustment: z.object({
    type: z.enum(['FIXED', 'PERCENTAGE', 'PER_UNIT', 'MULTIPLIER']),
    value: z.number(),
    unit: z.string().optional(), // e.g., "sqft", "room", "bathroom"
  }),
  priority: z.number().int().default(100),
  isActive: z.boolean().default(true),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
});

// GET /api/services/pricing - List pricing rules
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
    const serviceId = searchParams.get('serviceId');
    const type = searchParams.get('type');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where: any = { companyId: user.companyId };
    if (serviceId) where.serviceId = serviceId;
    if (type) where.type = type;
    if (activeOnly) where.isActive = true;

    const rules = await prisma.pricingRule.findMany({
      where,
      include: {
        service: {
          select: { id: true, name: true, category: true },
        },
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    console.error('GET /api/services/pricing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pricing rules' },
      { status: 500 }
    );
  }
}

// POST /api/services/pricing - Create pricing rule
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
    const validation = createPricingRuleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { serviceId, validFrom, validTo, ...ruleData } = validation.data;

    // Verify service belongs to company if specified
    if (serviceId) {
      const service = await prisma.service.findFirst({
        where: { id: serviceId, companyId: user.companyId },
      });
      if (!service) {
        return NextResponse.json({ error: 'Service not found' }, { status: 404 });
      }
    }

    const rule = await prisma.pricingRule.create({
      data: {
        ...ruleData,
        companyId: user.companyId,
        serviceId: serviceId || null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validTo: validTo ? new Date(validTo) : null,
      },
      include: {
        service: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    console.error('POST /api/services/pricing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create pricing rule' },
      { status: 500 }
    );
  }
}
