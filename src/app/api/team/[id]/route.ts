import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// ============================================
// Validation Schemas
// ============================================

const updateTeamMemberSchema = z.object({
  // User fields
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  newPassword: z.string().min(8).optional(),

  // Employment
  employeeId: z.string().optional().nullable(),
  hourlyRate: z.number().min(0).optional().nullable(),
  salary: z.number().min(0).optional().nullable(),
  payType: z.enum(['HOURLY', 'SALARY', 'CONTRACT']).optional(),
  hireDate: z.string().or(z.date()).transform(val => val ? new Date(val) : null).optional().nullable(),
  terminationDate: z.string().or(z.date()).transform(val => val ? new Date(val) : null).optional().nullable(),

  // Personal
  dateOfBirth: z.string().or(z.date()).transform(val => val ? new Date(val) : null).optional().nullable(),

  // Address
  street: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),

  // Work Profile
  photo: z.string().url().optional().nullable(),
  bio: z.string().optional().nullable(),
  specialties: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  yearsExperience: z.number().min(0).optional().nullable(),

  // Service Configuration
  serviceAreas: z.array(z.string()).optional(),
  serviceTypes: z.array(z.string()).optional(),
  speed: z.enum(['FAST', 'NORMAL', 'THOROUGH']).optional().nullable(),

  // Scheduling
  availability: z.record(z.any()).optional().nullable(),
  preferredHours: z.number().min(0).max(60).optional().nullable(),
  maxJobsPerDay: z.number().min(1).max(20).optional().nullable(),

  // Location
  locationId: z.string().optional().nullable(),

  // Emergency Contact
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),

  // Background Check
  backgroundCheckDate: z.string().or(z.date()).transform(val => val ? new Date(val) : null).optional().nullable(),
  backgroundCheckStatus: z.enum(['PENDING', 'PASSED', 'FAILED']).optional().nullable(),
  backgroundCheckUrl: z.string().url().optional().nullable(),

  // Status
  isActive: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
});

// ============================================
// GET /api/team/[id] - Get team member details
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Only OWNER and ADMIN can view team member details
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Fetch team member with full details
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            avatar: true,
            isActive: true,
            isVerified: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
          },
        },
        managedLocations: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            assignedBookings: true,
            reviews: true,
            timeEntries: true,
            payLogs: true,
            qualityChecks: true,
            certificationRecords: true,
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

    // Get additional stats
    const [recentBookings, totalEarnings, recentReviews] = await Promise.all([
      // Recent completed bookings
      prisma.booking.findMany({
        where: {
          assignedCleanerId: teamMember.id,
          status: { in: ['COMPLETED', 'CLEANER_COMPLETED'] },
        },
        select: {
          id: true,
          bookingNumber: true,
          scheduledDate: true,
          finalPrice: true,
          customerRating: true,
          status: true,
        },
        orderBy: { scheduledDate: 'desc' },
        take: 5,
      }),

      // Total earnings from completed bookings
      prisma.booking.aggregate({
        where: {
          assignedCleanerId: teamMember.id,
          status: 'COMPLETED',
        },
        _sum: {
          finalPrice: true,
          tipAmount: true,
        },
      }),

      // Recent reviews
      prisma.review.findMany({
        where: {
          cleanerId: teamMember.id,
        },
        select: {
          id: true,
          overallRating: true,
          comment: true,
          createdAt: true,
          client: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Parse availability JSON if it exists
    let availability = null;
    if (teamMember.availability) {
      try {
        availability = typeof teamMember.availability === 'string'
          ? JSON.parse(teamMember.availability)
          : teamMember.availability;
      } catch {
        availability = teamMember.availability;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...teamMember,
        availability,
        stats: {
          totalEarnings: totalEarnings._sum.finalPrice || 0,
          totalTips: totalEarnings._sum.tipAmount || 0,
          recentBookings,
          recentReviews,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/team/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team member' },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH /api/team/[id] - Update team member
// ============================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateTeamMemberSchema.parse(body);

    // Verify the team member belongs to the same company
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        id,
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

    // Validate location belongs to the same company if provided
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

    // Update in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user fields if provided
      const userUpdateData: any = {};
      if (validatedData.firstName !== undefined) userUpdateData.firstName = validatedData.firstName;
      if (validatedData.lastName !== undefined) userUpdateData.lastName = validatedData.lastName;
      if (validatedData.phone !== undefined) userUpdateData.phone = validatedData.phone;
      if (validatedData.avatar !== undefined) userUpdateData.avatar = validatedData.avatar;

      // Handle password update
      if (validatedData.newPassword) {
        userUpdateData.passwordHash = await hashPassword(validatedData.newPassword);
      }

      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: teamMember.userId },
          data: userUpdateData,
        });
      }

      // Update team member fields
      const teamMemberUpdateData: any = {};

      // Employment
      if (validatedData.employeeId !== undefined) teamMemberUpdateData.employeeId = validatedData.employeeId;
      if (validatedData.hourlyRate !== undefined) teamMemberUpdateData.hourlyRate = validatedData.hourlyRate;
      if (validatedData.salary !== undefined) teamMemberUpdateData.salary = validatedData.salary;
      if (validatedData.payType !== undefined) teamMemberUpdateData.payType = validatedData.payType;
      if (validatedData.hireDate !== undefined) teamMemberUpdateData.hireDate = validatedData.hireDate;
      if (validatedData.terminationDate !== undefined) teamMemberUpdateData.terminationDate = validatedData.terminationDate;

      // Personal
      if (validatedData.dateOfBirth !== undefined) teamMemberUpdateData.dateOfBirth = validatedData.dateOfBirth;

      // Address
      if (validatedData.street !== undefined) teamMemberUpdateData.street = validatedData.street;
      if (validatedData.city !== undefined) teamMemberUpdateData.city = validatedData.city;
      if (validatedData.state !== undefined) teamMemberUpdateData.state = validatedData.state;
      if (validatedData.zip !== undefined) teamMemberUpdateData.zip = validatedData.zip;

      // Work Profile
      if (validatedData.photo !== undefined) teamMemberUpdateData.photo = validatedData.photo;
      if (validatedData.bio !== undefined) teamMemberUpdateData.bio = validatedData.bio;
      if (validatedData.specialties !== undefined) teamMemberUpdateData.specialties = validatedData.specialties;
      if (validatedData.certifications !== undefined) teamMemberUpdateData.certifications = validatedData.certifications;
      if (validatedData.languages !== undefined) teamMemberUpdateData.languages = validatedData.languages;
      if (validatedData.yearsExperience !== undefined) teamMemberUpdateData.yearsExperience = validatedData.yearsExperience;

      // Service Configuration
      if (validatedData.serviceAreas !== undefined) teamMemberUpdateData.serviceAreas = validatedData.serviceAreas;
      if (validatedData.serviceTypes !== undefined) teamMemberUpdateData.serviceTypes = validatedData.serviceTypes;
      if (validatedData.speed !== undefined) teamMemberUpdateData.speed = validatedData.speed;

      // Scheduling
      if (validatedData.availability !== undefined) {
        teamMemberUpdateData.availability = validatedData.availability
          ? JSON.stringify(validatedData.availability)
          : null;
      }
      if (validatedData.preferredHours !== undefined) teamMemberUpdateData.preferredHours = validatedData.preferredHours;
      if (validatedData.maxJobsPerDay !== undefined) teamMemberUpdateData.maxJobsPerDay = validatedData.maxJobsPerDay;

      // Location
      if (validatedData.locationId !== undefined) teamMemberUpdateData.locationId = validatedData.locationId;

      // Emergency Contact
      if (validatedData.emergencyContactName !== undefined) teamMemberUpdateData.emergencyContactName = validatedData.emergencyContactName;
      if (validatedData.emergencyContactPhone !== undefined) teamMemberUpdateData.emergencyContactPhone = validatedData.emergencyContactPhone;

      // Background Check
      if (validatedData.backgroundCheckDate !== undefined) teamMemberUpdateData.backgroundCheckDate = validatedData.backgroundCheckDate;
      if (validatedData.backgroundCheckStatus !== undefined) teamMemberUpdateData.backgroundCheckStatus = validatedData.backgroundCheckStatus;
      if (validatedData.backgroundCheckUrl !== undefined) teamMemberUpdateData.backgroundCheckUrl = validatedData.backgroundCheckUrl;

      // Status
      if (validatedData.isActive !== undefined) teamMemberUpdateData.isActive = validatedData.isActive;
      if (validatedData.isAvailable !== undefined) teamMemberUpdateData.isAvailable = validatedData.isAvailable;

      const updated = await tx.teamMember.update({
        where: { id },
        data: teamMemberUpdateData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              role: true,
              avatar: true,
              isActive: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Team member updated successfully',
    });
  } catch (error) {
    console.error('PATCH /api/team/[id] error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update team member' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/team/[id] - Deactivate team member
// ============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Only OWNER and ADMIN can deactivate team members
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Verify the team member belongs to the same company
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        id,
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

    // Prevent deactivating yourself
    if (teamMember.userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      );
    }

    // Check for pending/upcoming bookings
    const upcomingBookings = await prisma.booking.count({
      where: {
        assignedCleanerId: id,
        status: { in: ['PENDING', 'CONFIRMED', 'CLEANER_EN_ROUTE', 'IN_PROGRESS'] },
        scheduledDate: { gte: new Date() },
      },
    });

    if (upcomingBookings > 0) {
      return NextResponse.json(
        {
          error: 'Cannot deactivate team member with upcoming bookings',
          details: `${upcomingBookings} upcoming booking(s) must be reassigned first`,
        },
        { status: 400 }
      );
    }

    // Deactivate in a transaction (soft delete)
    await prisma.$transaction(async (tx) => {
      // Deactivate the team member
      await tx.teamMember.update({
        where: { id },
        data: {
          isActive: false,
          isAvailable: false,
          terminationDate: new Date(),
        },
      });

      // Deactivate the associated user account
      await tx.user.update({
        where: { id: teamMember.userId },
        data: {
          isActive: false,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Team member deactivated successfully',
    });
  } catch (error) {
    console.error('DELETE /api/team/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate team member' },
      { status: 500 }
    );
  }
}
