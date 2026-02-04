import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// PUT /api/marketing/discounts/[id] - Update a discount code
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify discount belongs to company
    const discount = await prisma.discountCode.findFirst({
      where: { id: params.id, companyId: user.companyId },
    });

    if (!discount) {
      return NextResponse.json({ error: 'Discount code not found' }, { status: 404 });
    }

    const body = await req.json();
    const { code, discountType, discountValue, validFrom, validUntil, maxUses, isActive } = body;

    // Validate if updating
    if (discountType && !['PERCENT', 'FIXED'].includes(discountType)) {
      return NextResponse.json({ error: 'Discount type must be PERCENT or FIXED' }, { status: 400 });
    }

    if (discountValue !== undefined && discountValue <= 0) {
      return NextResponse.json({ error: 'Discount value must be greater than 0' }, { status: 400 });
    }

    if (discountType === 'PERCENT' && discountValue > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 });
    }

    // Check duplicate code if changing
    if (code && code.trim().toUpperCase() !== discount.code) {
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
    }

    const updated = await prisma.discountCode.update({
      where: { id: params.id },
      data: {
        ...(code && { code: code.trim().toUpperCase() }),
        ...(discountType && { discountType }),
        ...(discountValue !== undefined && { discountValue }),
        ...(validFrom && { validFrom: new Date(validFrom) }),
        ...(validUntil && { validUntil: new Date(validUntil) }),
        ...(maxUses !== undefined && { maxUses: maxUses ? parseInt(maxUses) : null }),
        ...(typeof isActive === 'boolean' && { isActive }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('PUT /api/marketing/discounts/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update discount code' },
      { status: 500 }
    );
  }
}

// DELETE /api/marketing/discounts/[id] - Delete a discount code
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify discount belongs to company
    const discount = await prisma.discountCode.findFirst({
      where: { id: params.id, companyId: user.companyId },
    });

    if (!discount) {
      return NextResponse.json({ error: 'Discount code not found' }, { status: 404 });
    }

    await prisma.discountCode.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Discount code deleted' });
  } catch (error) {
    console.error('DELETE /api/marketing/discounts/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete discount code' },
      { status: 500 }
    );
  }
}
