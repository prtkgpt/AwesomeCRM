// ============================================
// CleanDayCRM - Individual Payment API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updatePaymentSchema = z.object({
  status: z.enum(['PENDING', 'AUTHORIZED', 'CAPTURED', 'PAID', 'REFUNDED', 'FAILED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
});

// GET /api/payments/[id] - Get payment details
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

    const payment = await prisma.payment.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
      include: {
        booking: {
          include: {
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            address: true,
          },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('GET /api/payments/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment' },
      { status: 500 }
    );
  }
}

// PATCH /api/payments/[id] - Update payment
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
    const validation = updatePaymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: params.id },
      data: {
        ...validation.data,
        ...(validation.data.status === 'PAID' && !payment.capturedAt
          ? { capturedAt: new Date() }
          : {}),
      },
      include: {
        booking: {
          include: {
            client: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    // Update booking payment status if needed
    if (validation.data.status && payment.bookingId) {
      const totalPaid = await prisma.payment.aggregate({
        where: { bookingId: payment.bookingId, status: 'PAID' },
        _sum: { amount: true },
      });

      const booking = await prisma.booking.findUnique({
        where: { id: payment.bookingId },
      });

      if (booking) {
        const isPaid = (totalPaid._sum.amount || 0) >= booking.finalPrice;
        await prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            isPaid,
            paidAt: isPaid ? new Date() : null,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedPayment,
    });
  } catch (error) {
    console.error('PATCH /api/payments/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}
