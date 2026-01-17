import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/team/members/[id] - Get team member details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch team member with full details
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: teamMember });
  } catch (error) {
    console.error('GET /api/team/members/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team member' },
      { status: 500 }
    );
  }
}

// PATCH /api/team/members/[id] - Update team member
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
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can update team members
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Verify the team member belongs to the same company
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
      include: {
        user: true,
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    // If reactivating with a new password, update both user and team member
    if (body.isActive && body.newPassword) {
      const hashedPassword = await bcrypt.hash(body.newPassword, 10);

      const result = await prisma.$transaction(async (tx) => {
        // Update user password
        await tx.user.update({
          where: { id: teamMember.userId },
          data: { passwordHash: hashedPassword },
        });

        // Update team member
        const updated = await tx.teamMember.update({
          where: { id: params.id },
          data: {
            isActive: true,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                role: true,
              },
            },
          },
        });

        return updated;
      });

      return NextResponse.json({ success: true, data: result });
    }

    // Regular update without password change
    const result = await prisma.$transaction(async (tx) => {
      // Update user fields if provided
      if (body.firstName !== undefined || body.lastName !== undefined || body.email !== undefined || body.phone !== undefined) {
        await tx.user.update({
          where: { id: teamMember.userId },
          data: {
            ...(body.firstName !== undefined && { firstName: body.firstName }),
            ...(body.lastName !== undefined && { lastName: body.lastName }),
            ...(body.email !== undefined && { email: body.email }),
            ...(body.phone !== undefined && { phone: body.phone }),
          },
        });
      }

      // Update team member fields
      const updated = await tx.teamMember.update({
        where: { id: params.id },
        data: {
          ...(body.isActive !== undefined && { isActive: body.isActive }),
          ...(body.hourlyRate !== undefined && { hourlyRate: body.hourlyRate }),
          ...(body.employeeId !== undefined && { employeeId: body.employeeId }),
          ...(body.emergencyContactName !== undefined && { emergencyContactName: body.emergencyContactName }),
          ...(body.emergencyContactPhone !== undefined && { emergencyContactPhone: body.emergencyContactPhone }),
          ...(body.specialties !== undefined && { specialties: body.specialties }),
          // Address fields
          ...(body.street !== undefined && { street: body.street }),
          ...(body.city !== undefined && { city: body.city }),
          ...(body.state !== undefined && { state: body.state }),
          ...(body.zip !== undefined && { zip: body.zip }),
          // Work details
          ...(body.yearsExperience !== undefined && { yearsExperience: body.yearsExperience }),
          ...(body.speed !== undefined && { speed: body.speed }),
          ...(body.serviceAreas !== undefined && { serviceAreas: body.serviceAreas }),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              role: true,
            },
          },
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('PATCH /api/team/members/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update team member' },
      { status: 500 }
    );
  }
}
