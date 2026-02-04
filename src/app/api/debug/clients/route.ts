import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/debug/clients - Debug endpoint to see raw client data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const clients = await prisma.client.findMany({
      where: {
        companyId: user.companyId,
      },
      select: {
        id: true,
        name: true,
        hasInsurance: true,
        insuranceProvider: true,
        helperBeesReferralId: true,
        insurancePaymentAmount: true,
        standardCopayAmount: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: clients,
      debug: {
        totalClients: clients.length,
        withInsurance: clients.filter(c => c.hasInsurance).length,
        withoutInsurance: clients.filter(c => !c.hasInsurance).length,
      }
    });
  } catch (error) {
    console.error('GET /api/debug/clients error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}
