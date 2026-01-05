import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
