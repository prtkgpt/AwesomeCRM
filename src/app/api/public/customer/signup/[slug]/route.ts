import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * POST /api/public/customer/signup/[slug] - Customer signup for a specific company
 * Creates a customer account and links them to the company
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json();
    const { name, email, password, phone } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Find company by slug
    const company = await prisma.company.findUnique({
      where: { slug: params.slug },
      select: { id: true, name: true },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create customer user and client in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user account with CUSTOMER role
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          phone: phone || null,
          companyId: company.id,
          role: 'CUSTOMER',
        },
      });

      // Create corresponding client record (for the company's client management)
      const client = await tx.client.create({
        data: {
          name,
          email,
          phone: phone || null,
          companyId: company.id,
          userId: user.id, // Link to the user who created this client
          customerUserId: user.id, // Link client to customer user account
          // Generate referral code for the customer
          referralCode: `${name.split(' ')[0].toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        },
      });

      return { user, client };
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      data: {
        userId: result.user.id,
        clientId: result.client.id,
        referralCode: result.client.referralCode,
      },
    });
  } catch (error) {
    console.error('POST /api/public/customer/signup error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create account',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
