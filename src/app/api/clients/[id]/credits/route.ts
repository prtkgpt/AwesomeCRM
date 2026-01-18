// ============================================
// CleanDayCRM - Client Credits API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/clients/[id]/credits - Get credit transactions for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: clientId } = await params;

    // Verify the user has access to this client
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if client exists and belongs to the same company
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        companyId: user.companyId,
      },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Fetch credit transactions
    const transactions = await prisma.creditTransaction.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error('GET /api/clients/[id]/credits error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch credit transactions' },
      { status: 500 }
    );
  }
}

// POST /api/clients/[id]/credits - Add a credit transaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: clientId } = await params;
    const body = await request.json();
    const { type, amount, description, expiresAt } = body;

    if (!type || amount === undefined) {
      return NextResponse.json(
        { error: 'Type and amount are required' },
        { status: 400 }
      );
    }

    // Verify the user has access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get client and current balance
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        companyId: user.companyId,
      },
      select: { id: true, creditBalance: true },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const newBalance = (client.creditBalance || 0) + amount;

    // Create the transaction and update balance in a transaction
    const [transaction] = await prisma.$transaction([
      prisma.creditTransaction.create({
        data: {
          clientId,
          type,
          amount,
          balance: newBalance,
          description,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      }),
      prisma.client.update({
        where: { id: clientId },
        data: { creditBalance: newBalance },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error('POST /api/clients/[id]/credits error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create credit transaction' },
      { status: 500 }
    );
  }
}
