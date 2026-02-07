import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail, getTeamInvitationEmailTemplate } from '@/lib/email';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// PATCH /api/team/invitations/[id] - Resend an invitation
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        companyId: true,
        role: true,
        name: true,
        company: {
          select: {
            name: true,
            resendApiKey: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can resend invitations
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if invitation exists and belongs to the company
    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    if (invitation.companyId !== user.companyId) {
      return NextResponse.json(
        { error: 'You can only resend invitations from your company' },
        { status: 403 }
      );
    }

    // Check if invitation is not pending
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only resend pending invitations' },
        { status: 400 }
      );
    }

    // Extend expiration by 7 days from now
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await prisma.invitation.update({
      where: { id: params.id },
      data: { expiresAt: newExpiresAt },
    });

    // Resend invitation email
    const inviteLink = `${process.env.NEXTAUTH_URL}/invite/${invitation.token}`;
    const invitedByName = user.name || 'Your team administrator';
    const companyName = user.company?.name || 'Your Company';

    try {
      const emailHtml = getTeamInvitationEmailTemplate({
        invitedEmail: invitation.email,
        companyName,
        role: invitation.role,
        invitedByName,
        inviteLink,
        expiresAt: newExpiresAt,
      });

      await sendEmail({
        to: invitation.email,
        subject: `Reminder: You're invited to join ${companyName} on CleanDay CRM`,
        html: emailHtml,
        type: 'notification',
        apiKey: user.company?.resendApiKey || undefined,
      });

      console.log(`✉️  Resent invitation email to ${invitation.email}`);

      return NextResponse.json({
        success: true,
        message: `Invitation resent to ${invitation.email}`,
      });
    } catch (emailError: any) {
      console.error('Failed to resend invitation email:', emailError);

      return NextResponse.json({
        success: false,
        error: 'Failed to send email',
        details: emailError.message,
        inviteLink, // Include link so admin can share manually
      }, { status: 500 });
    }
  } catch (error) {
    console.error('PATCH /api/team/invitations/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}

// DELETE /api/team/invitations/[id] - Delete/cancel an invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can delete invitations
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if invitation exists and belongs to the company
    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    if (invitation.companyId !== user.companyId) {
      return NextResponse.json(
        { error: 'You can only delete invitations from your company' },
        { status: 403 }
      );
    }

    // Check if invitation is already accepted
    if (invitation.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Cannot delete accepted invitations' },
        { status: 400 }
      );
    }

    // Delete the invitation
    await prisma.invitation.delete({
      where: { id: params.id },
    });

    console.log(`✅ Deleted invitation: ${params.id} (${invitation.email})`);

    return NextResponse.json({
      success: true,
      message: 'Invitation deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/team/invitations/[id] error:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to delete invitation' },
      { status: 500 }
    );
  }
}
