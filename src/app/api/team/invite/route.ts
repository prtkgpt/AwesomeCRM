import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, generateToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendEmail, getTeamInvitationEmailTemplate } from '@/lib/email';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// ============================================
// Validation Schemas
// ============================================

const sendInvitationSchema = z.object({
  email: z.string().email('Invalid email address').transform(val => val.toLowerCase()),
  role: z.enum(['ADMIN', 'CLEANER'], {
    errorMap: () => ({ message: 'Role must be ADMIN or CLEANER' }),
  }),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().optional(),
  message: z.string().max(500, 'Personal message must be less than 500 characters').optional(),
  expiresInDays: z.number().min(1).max(30).default(7),

  // Pre-fill team member data (will be used when invitation is accepted)
  employeeId: z.string().optional(),
  hourlyRate: z.number().min(0).optional(),
  locationId: z.string().optional(),
  serviceAreas: z.array(z.string()).optional(),
  specialties: z.array(z.string()).optional(),
});

const listInvitationsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED', 'all']).default('PENDING'),
});

// ============================================
// GET /api/team/invite - List all pending invitations
// ============================================
export async function GET(request: NextRequest) {
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

    // Only OWNER and ADMIN can view invitations
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = listInvitationsQuerySchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      status: searchParams.get('status') || 'PENDING',
    });

    const { page, limit, status } = queryParams;

    // Build where clause
    const where: any = {
      companyId: user.companyId,
    };

    if (status !== 'all') {
      where.status = status;
    }

    // Check and update expired invitations
    await prisma.invitation.updateMany({
      where: {
        companyId: user.companyId,
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    // Get total count
    const totalCount = await prisma.invitation.count({ where });

    // Get invitations with pagination
    const invitations = await prisma.invitation.findMany({
      where,
      include: {
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: invitations.map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        expiresAt: inv.expiresAt,
        acceptedAt: inv.acceptedAt,
        createdAt: inv.createdAt,
        invitedBy: inv.invitedBy ? {
          id: inv.invitedBy.id,
          name: `${inv.invitedBy.firstName || ''} ${inv.invitedBy.lastName || ''}`.trim(),
          email: inv.invitedBy.email,
        } : null,
        isExpired: inv.expiresAt < new Date() && inv.status === 'PENDING',
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('GET /api/team/invite error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/team/invite - Send team member invitation
// ============================================
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId, role, and company details
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        companyId: true,
        role: true,
        firstName: true,
        lastName: true,
        company: {
          select: {
            name: true,
            resendApiKey: true,
            logo: true,
            primaryColor: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can send invitations
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = sendInvitationSchema.parse(body);

    // Check if user already exists with this email
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      // Check if they're already in this company
      if (existingUser.companyId === user.companyId) {
        return NextResponse.json(
          { error: 'A user with this email is already a member of your team' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'A user with this email already exists in the system' },
        { status: 400 }
      );
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        companyId: user.companyId,
        email: validatedData.email,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        {
          error: 'A pending invitation already exists for this email',
          existingInvitation: {
            id: existingInvitation.id,
            expiresAt: existingInvitation.expiresAt,
          },
        },
        { status: 400 }
      );
    }

    // Validate location belongs to the company if provided
    if (validatedData.locationId) {
      const location = await prisma.location.findFirst({
        where: {
          id: validatedData.locationId,
          companyId: user.companyId,
        },
      });

      if (!location) {
        return NextResponse.json(
          { error: 'Invalid location ID' },
          { status: 400 }
        );
      }
    }

    // Generate unique invitation token
    const token = generateToken(48);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validatedData.expiresInDays);

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        companyId: user.companyId,
        email: validatedData.email,
        role: validatedData.role,
        token,
        invitedById: session.user.id,
        status: 'PENDING',
        expiresAt,
      },
    });

    // Build invite link
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/invite/${token}`;

    // Send invitation email
    const invitedByName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Your team administrator';
    const companyName = user.company?.name || 'Your Company';

    let emailSent = false;
    let emailError: string | null = null;

    try {
      const emailHtml = getTeamInvitationEmailTemplate({
        invitedEmail: validatedData.email,
        companyName,
        role: validatedData.role,
        invitedByName,
        inviteLink,
        expiresAt,
      });

      await sendEmail({
        to: validatedData.email,
        subject: `You're invited to join ${companyName} on CleanDay CRM`,
        html: emailHtml,
        type: 'notification',
        apiKey: user.company?.resendApiKey || undefined,
      });

      emailSent = true;
      console.log(`Invitation email sent to ${validatedData.email}`);
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      emailError = error instanceof Error ? error.message : 'Unknown error';
    }

    // Prepare response
    const response: any = {
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      },
      message: emailSent
        ? `Invitation sent successfully to ${validatedData.email}`
        : `Invitation created but email delivery failed. Please share the link manually.`,
    };

    // Include invite link if email failed (so admin can share it manually)
    if (!emailSent) {
      response.inviteLink = inviteLink;
      response.warning = 'Email delivery failed. Please share the invite link manually.';
      response.emailError = emailError;
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('POST /api/team/invite error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/team/invite - Cancel/revoke invitation
// ============================================
export async function DELETE(request: NextRequest) {
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

    // Only OWNER and ADMIN can cancel invitations
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get invitation ID from query params
    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('id');

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      );
    }

    // Find the invitation
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        companyId: user.companyId,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    if (invitation.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Cannot cancel an invitation that has already been accepted' },
        { status: 400 }
      );
    }

    if (invitation.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Invitation has already been cancelled' },
        { status: 400 }
      );
    }

    // Cancel the invitation
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully',
    });
  } catch (error) {
    console.error('DELETE /api/team/invite error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel invitation' },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH /api/team/invite - Resend invitation
// ============================================
export async function PATCH(request: NextRequest) {
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
        firstName: true,
        lastName: true,
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
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { invitationId, expiresInDays = 7 } = body;

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      );
    }

    // Find the invitation
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        companyId: user.companyId,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    if (invitation.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Cannot resend an invitation that has already been accepted' },
        { status: 400 }
      );
    }

    // Generate new token and expiration
    const newToken = generateToken(48);
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + expiresInDays);

    // Update invitation
    const updatedInvitation = await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
        status: 'PENDING',
      },
    });

    // Build invite link
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/invite/${newToken}`;

    // Resend email
    const invitedByName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Your team administrator';
    const companyName = user.company?.name || 'Your Company';

    let emailSent = false;

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

      emailSent = true;
    } catch (error) {
      console.error('Failed to resend invitation email:', error);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedInvitation.id,
        email: updatedInvitation.email,
        expiresAt: updatedInvitation.expiresAt,
      },
      inviteLink: emailSent ? undefined : inviteLink,
      message: emailSent
        ? `Invitation resent successfully to ${invitation.email}`
        : `Invitation renewed but email delivery failed. Please share the link manually.`,
      warning: emailSent ? undefined : 'Email delivery failed.',
    });
  } catch (error) {
    console.error('PATCH /api/team/invite error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}
