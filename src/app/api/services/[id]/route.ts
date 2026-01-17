// ============================================
// CleanDayCRM - Individual Service API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateServiceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  category: z.enum(['STANDARD', 'DEEP', 'MOVE_IN_OUT', 'POST_CONSTRUCTION', 'OFFICE', 'AIRBNB', 'CUSTOM']).optional(),
  basePrice: z.number().positive().optional(),
  duration: z.number().min(30).max(480).optional(),
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  features: z.array(z.string()).optional(),
  addOns: z.array(z.object({
    name: z.string(),
    price: z.number().positive(),
    duration: z.number().min(0),
  })).optional(),
  sortOrder: z.number().int().optional(),
});

// GET /api/services/[id] - Get service details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const service = await prisma.service.findFirst({
      where: { id: params.id, companyId: user.companyId },
      include: {
        pricingRules: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { bookings: true },
        },
      },
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Get booking stats
    const stats = await prisma.booking.aggregate({
      where: { serviceId: params.id, status: 'COMPLETED' },
      _count: true,
      _avg: { finalPrice: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...service,
        stats: {
          totalBookings: stats._count,
          averagePrice: stats._avg.finalPrice || service.basePrice,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/services/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch service' },
      { status: 500 }
    );
  }
}

// PATCH /api/services/[id] - Update service
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const validation = updateServiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const service = await prisma.service.findFirst({
      where: { id: params.id, companyId: user.companyId },
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const updatedService = await prisma.service.update({
      where: { id: params.id },
      data: validation.data,
      include: {
        pricingRules: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedService,
    });
  } catch (error) {
    console.error('PATCH /api/services/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update service' },
      { status: 500 }
    );
  }
}

// DELETE /api/services/[id] - Delete service
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const service = await prisma.service.findFirst({
      where: { id: params.id, companyId: user.companyId },
      include: { _count: { select: { bookings: true } } },
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // If service has bookings, just deactivate it
    if (service._count.bookings > 0) {
      await prisma.service.update({
        where: { id: params.id },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        message: 'Service deactivated (has existing bookings)',
      });
    }

    // Otherwise, delete it
    await prisma.service.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Service deleted',
    });
  } catch (error) {
    console.error('DELETE /api/services/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete service' },
      { status: 500 }
    );
  }
}
