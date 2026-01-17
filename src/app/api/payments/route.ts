// ============================================
// CleanDayCRM - Payments API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createPaymentSchema = z.object({
  bookingId: z.string().cuid(),
  amount: z.number().positive(),
  method: z.enum(['CARD', 'CASH', 'CHECK', 'BANK_TRANSFER', 'CREDITS']),
  notes: z.string().optional(),
  applyCredits: z.number().min(0).optional(),
});

// GET /api/payments - List payments
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
    const status = searchParams.get('status');
    const method = searchParams.get('method');
    const bookingId = searchParams.get('bookingId');
    const clientId = searchParams.get('clientId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {
      booking: { companyId: user.companyId },
    };

    if (status) where.status = status;
    if (method) where.method = method;
    if (bookingId) where.bookingId = bookingId;
    if (clientId) where.booking = { ...where.booking, clientId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          booking: {
            include: {
              client: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/payments error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

// POST /api/payments - Create a payment (manual payment recording)
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
    const validation = createPaymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { bookingId, amount, method, notes, applyCredits } = validation.data;

    // Verify booking exists and belongs to company
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, companyId: user.companyId },
      include: { client: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    let finalAmount = amount;
    let creditsApplied = 0;

    // Apply credits if requested
    if (applyCredits && applyCredits > 0 && booking.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: booking.clientId },
        select: { creditBalance: true },
      });

      if (client && client.creditBalance > 0) {
        creditsApplied = Math.min(applyCredits, client.creditBalance, amount);
        finalAmount = amount - creditsApplied;

        // Deduct credits from client and get new balance
        const updatedClient = await prisma.client.update({
          where: { id: booking.clientId },
          data: { creditBalance: { decrement: creditsApplied } },
        });

        // Record credit transaction (negative amount indicates redemption)
        await prisma.creditTransaction.create({
          data: {
            clientId: booking.clientId,
            amount: -creditsApplied,
            balance: updatedClient.creditBalance,
            type: 'COMPENSATION',
            description: `Credits applied to booking ${booking.bookingNumber}`,
          },
        });
      }
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        bookingId,
        companyId: user.companyId,
        clientId: booking.clientId!,
        amount: finalAmount,
        method,
        status: 'CAPTURED',
        notes: notes ? `${notes}${creditsApplied > 0 ? ` (Credits applied: $${creditsApplied})` : ''}` : (creditsApplied > 0 ? `Credits applied: $${creditsApplied}` : undefined),
        capturedAt: new Date(),
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

    // Update booking payment status
    const totalPaid = await prisma.payment.aggregate({
      where: { bookingId, status: 'CAPTURED' },
      _sum: { amount: true },
    });

    const isPaid = (totalPaid._sum.amount || 0) >= booking.finalPrice;

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        isPaid,
        paidAt: isPaid ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: payment,
      creditsApplied,
    });
  } catch (error) {
    console.error('POST /api/payments error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
