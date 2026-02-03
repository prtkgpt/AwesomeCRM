import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Helper: verify platform admin
async function verifyPlatformAdmin(session: any) {
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPlatformAdmin: true },
  });
  return user?.isPlatformAdmin === true;
}

// GET /api/platform/companies/[id] - Get company details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await verifyPlatformAdmin(session))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            clients: true,
            bookings: true,
            invoices: true,
            campaigns: true,
            teamMembers: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error('Platform: get company error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch company' },
      { status: 500 }
    );
  }
}

// PATCH /api/platform/companies/[id] - Update company
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await verifyPlatformAdmin(session))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: params.id },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, email, phone, plan, subscriptionStatus } = body;

    const updated = await prisma.company.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(plan && { plan }),
        ...(subscriptionStatus && { subscriptionStatus }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Company updated',
    });
  } catch (error) {
    console.error('Platform: update company error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update company' },
      { status: 500 }
    );
  }
}
