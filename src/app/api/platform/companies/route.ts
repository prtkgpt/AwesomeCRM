import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

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

// GET /api/platform/companies - List all companies
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await verifyPlatformAdmin(session))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          phone: true,
          plan: true,
          subscriptionStatus: true,
          createdAt: true,
          _count: {
            select: {
              users: true,
              clients: true,
              bookings: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.company.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: companies,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Platform: list companies error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}

// POST /api/platform/companies - Onboard a new company with owner account
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
    const {
      companyName,
      companySlug,
      companyEmail,
      companyPhone,
      ownerName,
      ownerEmail,
      ownerPassword,
      plan,
    } = body;

    // Validate required fields
    if (!companyName || !companySlug || !ownerEmail || !ownerPassword) {
      return NextResponse.json(
        { success: false, error: 'Company name, slug, owner email, and password are required' },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(companySlug)) {
      return NextResponse.json(
        { success: false, error: 'Slug must be lowercase letters, numbers, and hyphens only' },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existingCompany = await prisma.company.findUnique({
      where: { slug: companySlug },
    });
    if (existingCompany) {
      return NextResponse.json(
        { success: false, error: 'A company with this slug already exists' },
        { status: 409 }
      );
    }

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email: ownerEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(ownerPassword, 12);

    // Create company and owner in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          slug: companySlug,
          email: companyEmail || null,
          phone: companyPhone || null,
          plan: plan || 'FREE',
        },
      });

      const owner = await tx.user.create({
        data: {
          email: ownerEmail,
          passwordHash,
          name: ownerName || companyName,
          companyId: company.id,
          role: 'OWNER',
        },
      });

      return { company, owner };
    });

    return NextResponse.json({
      success: true,
      data: {
        company: {
          id: result.company.id,
          name: result.company.name,
          slug: result.company.slug,
        },
        owner: {
          id: result.owner.id,
          email: result.owner.email,
          name: result.owner.name,
        },
      },
      message: `Company "${companyName}" created with owner account`,
    });
  } catch (error) {
    console.error('Platform: create company error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create company' },
      { status: 500 }
    );
  }
}
