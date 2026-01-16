import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/team/accept-invite - Accept invitation and create account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, name, password, phone } = body;

    if (!token || !name || !password) {
      return NextResponse.json(
        { error: 'Token, name, and password are required' },
        { status: 400 }
      );
    }

    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date() > new Date(invitation.expiresAt)) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    // Check if already accepted
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Invitation has already been used' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user and team member in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          name,
          phone,
          companyId: invitation.companyId,
          role: invitation.role,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          companyId: true,
          role: true,
        },
      });

      // If role is CLEANER or ADMIN, create team member profile
      if (invitation.role === 'CLEANER' || invitation.role === 'ADMIN') {
        await tx.teamMember.create({
          data: {
            companyId: invitation.companyId,
            userId: user.id,
            isActive: true,
          },
        });
      }

      // Mark invitation as accepted
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });

      return { user };
    });

    return NextResponse.json({
      success: true,
      data: result.user,
      message: 'Account created successfully',
    });
  } catch (error) {
    console.error('POST /api/team/accept-invite error:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
