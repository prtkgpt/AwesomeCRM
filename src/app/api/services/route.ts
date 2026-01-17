// ============================================
// CleanDayCRM - Services Management API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  category: z.enum(['STANDARD', 'DEEP', 'MOVE_IN_OUT', 'POST_CONSTRUCTION', 'OFFICE', 'AIRBNB', 'CUSTOM']),
  basePrice: z.number().positive(),
  duration: z.number().min(30).max(480), // minutes
  isActive: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  icon: z.string().optional(),
  color: z.string().optional(),
  features: z.array(z.string()).default([]),
  addOns: z.array(z.object({
    name: z.string(),
    price: z.number().positive(),
    duration: z.number().min(0),
  })).optional(),
});

// GET /api/services - List services
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
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where: any = { companyId: user.companyId };
    if (category) where.category = category;
    if (activeOnly) where.isActive = true;

    const services = await prisma.service.findMany({
      where,
      include: {
        pricingRules: {
          where: { isActive: true },
          orderBy: { priority: 'asc' },
        },
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: [
        { isPopular: 'desc' },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: services,
    });
  } catch (error) {
    console.error('GET /api/services error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

// POST /api/services - Create a service
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
    const validation = createServiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { addOns, ...serviceData } = validation.data;

    // Get max sort order
    const maxOrder = await prisma.service.aggregate({
      where: { companyId: user.companyId },
      _max: { sortOrder: true },
    });

    const service = await prisma.service.create({
      data: {
        ...serviceData,
        companyId: user.companyId,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
        addOns: addOns || [],
      },
      include: {
        pricingRules: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: service,
    });
  } catch (error) {
    console.error('POST /api/services error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create service' },
      { status: 500 }
    );
  }
}
