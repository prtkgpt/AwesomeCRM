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

// POST /api/platform/impersonate - Get owner info for a company to assist with debugging
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await verifyPlatformAdmin(session))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId is required' },
        { status: 400 }
      );
    }

    // Find the company
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    // Find the OWNER user of this company
    const owner = await prisma.user.findFirst({
      where: {
        companyId: companyId,
        role: 'OWNER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!owner) {
      return NextResponse.json(
        { success: false, error: 'No owner found for this company' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          plan: company.plan,
        },
        owner: {
          id: owner.id,
          email: owner.email,
          name: owner.name,
          role: owner.role,
          createdAt: owner.createdAt,
        },
      },
      message: `Owner account found for "${company.name}". Use the email to log in as this user for debugging.`,
    });
  } catch (error) {
    console.error('Platform impersonate: error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch impersonation data' },
      { status: 500 }
    );
  }
}
