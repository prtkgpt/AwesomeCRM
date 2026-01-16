import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendEmail, getTeamInvitationEmailTemplate } from '@/lib/email';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/team/invite - Send team member invitation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId, role, and name
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        companyId: true,
        role: true,
        name: true,
        company: {
          select: {
            name: true,
            resendApiKey: true
          }
        }
      },
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

    // Send invitation email
    const inviteLink = `${process.env.NEXTAUTH_URL}/invite/${token}`;
    const invitedByName = user.name || 'Your team administrator';
    const companyName = user.company?.name || 'Your Company';

    try {
      const emailHtml = getTeamInvitationEmailTemplate({
        invitedEmail: email,
        companyName,
        role,
        invitedByName,
        inviteLink,
        expiresAt,
      });

      await sendEmail({
        to: email,
        subject: `You're invited to join ${companyName} on CleanDay CRM`,
        html: emailHtml,
        type: 'notification',
        apiKey: user.company?.resendApiKey || undefined,
      });

      console.log(`✉️ Invitation email sent to ${email}`);

      return NextResponse.json({
        success: true,
        data: invitation,
        message: `Invitation sent to ${email}`,
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);

      // Invitation was created but email failed - still return success
      // but include the link so admin can manually share it
      return NextResponse.json({
        success: true,
        data: invitation,
        inviteLink, // Include this so admins can manually share the link
        message: `Invitation created but email failed to send. Share this link with ${email}: ${inviteLink}`,
        warning: 'Email delivery failed. Please share the invite link manually.',
      });
    }
  } catch (error) {
    console.error('POST /api/team/invite error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}
