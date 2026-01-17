import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Validation schema for pricing rules
const pricingRuleSchema = z.object({
  type: z.enum(['BEDROOM', 'BATHROOM', 'ADDON', 'CUSTOM']),
  name: z.string().min(1, 'Name is required'),
  price: z.number().min(0, 'Price must be positive'),
  duration: z.number().min(0, 'Duration must be positive'),
  display: z.enum(['BOTH', 'BOOKING', 'ESTIMATE', 'HIDDEN']).default('BOTH'),
  sortOrder: z.number().default(0),
  quantity: z.number().nullable().optional(),
  serviceType: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

// GET /api/pricing/rules - List all pricing rules for company
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can view pricing rules
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const isActive = searchParams.get('isActive');

    const rules = await prisma.pricingRule.findMany({
      where: {
        companyId: user.companyId,
        ...(type && { type: type as any }),
        ...(isActive !== null && { isActive: isActive === 'true' }),
      },
      orderBy: [
        { type: 'asc' },
        { sortOrder: 'asc' },
        { quantity: 'asc' },
      ],
    });

    return NextResponse.json({ success: true, data: rules });
  } catch (error) {
    console.error('GET /api/pricing/rules error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pricing rules' },
      { status: 500 }
    );
  }
}

// POST /api/pricing/rules - Create new pricing rule
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can create pricing rules
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = pricingRuleSchema.parse(body);

    const rule = await prisma.pricingRule.create({
      data: {
        companyId: user.companyId,
        ...validatedData,
      },
    });

    return NextResponse.json({
      success: true,
      data: rule,
      message: 'Pricing rule created successfully',
    });
  } catch (error) {
    console.error('POST /api/pricing/rules error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create pricing rule' },
      { status: 500 }
    );
  }
}
