import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// POST /api/team/invite - Send team member invitation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true, company: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can send invitations
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['ADMIN', 'CLEANER'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be ADMIN or CLEANER' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Check if invitation already exists
    const existingInvite = await prisma.invitation.findFirst({
      where: {
        companyId: user.companyId,
        email,
        status: 'PENDING',
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: 'Invitation already sent to this email' },
        { status: 400 }
      );
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        companyId: user.companyId,
        email,
        role,
        token,
        invitedById: session.user.id,
        expiresAt,
        status: 'PENDING',
      },
    });

    // TODO: Send email with invitation link
    // For now, we'll just return the invitation data
    // In production, you'd send an email with a link like:
    // https://yourdomain.com/invite/${token}

    const inviteLink = `${process.env.NEXTAUTH_URL}/invite/${token}`;

    return NextResponse.json({
      success: true,
      data: invitation,
      inviteLink, // Include this so admins can manually share the link
      message: `Invitation created. Share this link with ${email}: ${inviteLink}`,
    });
  } catch (error) {
    console.error('POST /api/team/invite error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}
