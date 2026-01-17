import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/customer/invoices - Get customer's invoices
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only customers can access this endpoint
    if (user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get customer's client record
    const client = await prisma.client.findFirst({
      where: {
        email: user.email,
        companyId: user.companyId,
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'all';

    let where: any = { clientId: client.id };

    if (statusFilter === 'paid') {
      where.status = 'PAID';
    } else if (statusFilter === 'pending') {
      where.status = { notIn: ['PAID'] };
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        booking: {
          select: {
            scheduledDate: true,
            serviceType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    console.error('GET /api/customer/invoices error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
