import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for updating pricing rules
const updatePricingRuleSchema = z.object({
  type: z.enum(['BEDROOM', 'BATHROOM', 'ADDON', 'CUSTOM']).optional(),
  name: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  duration: z.number().min(0).optional(),
  display: z.enum(['BOTH', 'BOOKING', 'ESTIMATE', 'HIDDEN']).optional(),
  sortOrder: z.number().optional(),
  quantity: z.number().nullable().optional(),
  serviceType: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/pricing/rules/[id] - Get single pricing rule
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
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rule = await prisma.pricingRule.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!rule) {
      return NextResponse.json(
        { success: false, error: 'Pricing rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    console.error('GET /api/pricing/rules/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pricing rule' },
      { status: 500 }
    );
  }
}

// PUT /api/pricing/rules/[id] - Update pricing rule
export async function PUT(
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify ownership
    const existingRule = await prisma.pricingRule.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!existingRule) {
      return NextResponse.json(
        { success: false, error: 'Pricing rule not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updatePricingRuleSchema.parse(body);

    const rule = await prisma.pricingRule.update({
      where: { id: params.id },
      data: validatedData,
    });

    return NextResponse.json({
      success: true,
      data: rule,
      message: 'Pricing rule updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/pricing/rules/[id] error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update pricing rule' },
      { status: 500 }
    );
  }
}

// DELETE /api/pricing/rules/[id] - Delete pricing rule
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify ownership
    const existingRule = await prisma.pricingRule.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!existingRule) {
      return NextResponse.json(
        { success: false, error: 'Pricing rule not found' },
        { status: 404 }
      );
    }

    await prisma.pricingRule.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Pricing rule deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/pricing/rules/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete pricing rule' },
      { status: 500 }
    );
  }
}
