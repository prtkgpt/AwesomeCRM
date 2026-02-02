import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/marketing/discounts - List all discount codes for the company
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';

    const where: any = { companyId: user.companyId };
    if (activeOnly) {
      where.isActive = true;
      where.validUntil = { gte: new Date() };
    }

    const discounts = await prisma.discountCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: discounts });
  } catch (error) {
    console.error('GET /api/marketing/discounts error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch discount codes' },
      { status: 500 }
    );
  }
}

// POST /api/marketing/discounts - Create a new discount code
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { code, discountType, discountValue, validFrom, validUntil, maxUses } = body;

    // Validation
    if (!code || !code.trim()) {
      return NextResponse.json({ error: 'Discount code is required' }, { status: 400 });
    }

    if (!discountType || !['PERCENT', 'FIXED'].includes(discountType)) {
      return NextResponse.json({ error: 'Discount type must be PERCENT or FIXED' }, { status: 400 });
    }

    if (!discountValue || discountValue <= 0) {
      return NextResponse.json({ error: 'Discount value must be greater than 0' }, { status: 400 });
    }

    if (discountType === 'PERCENT' && discountValue > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 });
    }

    if (!validFrom || !validUntil) {
      return NextResponse.json({ error: 'Valid from and valid until dates are required' }, { status: 400 });
    }

    if (new Date(validUntil) <= new Date(validFrom)) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    // Check for duplicate code within company
    const existing = await prisma.discountCode.findUnique({
      where: {
        companyId_code: {
          companyId: user.companyId,
          code: code.trim().toUpperCase(),
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'A discount code with this name already exists' }, { status: 400 });
    }

    const discount = await prisma.discountCode.create({
      data: {
        companyId: user.companyId,
        code: code.trim().toUpperCase(),
        discountType,
        discountValue,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        maxUses: maxUses ? parseInt(maxUses) : null,
      },
    });

    return NextResponse.json({ success: true, data: discount }, { status: 201 });
  } catch (error) {
    console.error('POST /api/marketing/discounts error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create discount code' },
      { status: 500 }
    );
  }
}
