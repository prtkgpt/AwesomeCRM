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

const listTeamMembersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  role: z.enum(['ADMIN', 'CLEANER']).optional(),
  status: z.enum(['active', 'inactive', 'all']).default('active'),
  availability: z.enum(['available', 'unavailable', 'all']).default('all'),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'hireDate', 'rating', 'jobsCompleted', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const createTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'CLEANER']),

  // Employment
  employeeId: z.string().optional(),
  hourlyRate: z.number().min(0).optional(),
  salary: z.number().min(0).optional(),
  payType: z.enum(['HOURLY', 'SALARY', 'CONTRACT']).default('HOURLY'),
  hireDate: z.string().or(z.date()).transform(val => val ? new Date(val) : undefined).optional(),

  // Address
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),

  // Work Profile
  bio: z.string().optional(),
  specialties: z.array(z.string()).default([]),
  serviceAreas: z.array(z.string()).default([]),
  serviceTypes: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  yearsExperience: z.number().min(0).optional(),
  speed: z.enum(['FAST', 'NORMAL', 'THOROUGH']).optional(),

  // Scheduling
  availability: z.object({
    monday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }).optional(),
    tuesday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }).optional(),
    wednesday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }).optional(),
    thursday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }).optional(),
    friday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }).optional(),
    saturday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }).optional(),
    sunday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }).optional(),
  }).optional(),
  preferredHours: z.number().min(0).max(60).optional(),
  maxJobsPerDay: z.number().min(1).max(20).optional(),

  // Location
  locationId: z.string().optional(),

  // Emergency Contact
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

// ============================================
// GET /api/team - List all team members
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

    // Only OWNER and ADMIN can view team members
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      role: searchParams.get('role') || undefined,
      status: searchParams.get('status') || 'active',
      availability: searchParams.get('availability') || 'all',
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    };

    const params = listTeamMembersSchema.parse(queryParams);
    const { page, limit, role, status, availability, search, sortBy, sortOrder } = params;

    // Build where clause
    const where: any = {
      companyId: user.companyId,
    };

    // Status filter
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }
    // 'all' means no status filter

    // Availability filter
    if (availability === 'available') {
      where.isAvailable = true;
    } else if (availability === 'unavailable') {
      where.isAvailable = false;
    }

    // Role filter
    if (role) {
      where.user = {
        role: role,
      };
    }

    // Search filter
    if (search) {
      where.OR = [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { employeeId: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    let orderBy: any;
    switch (sortBy) {
      case 'name':
        orderBy = { user: { firstName: sortOrder } };
        break;
      case 'hireDate':
        orderBy = { hireDate: sortOrder };
        break;
      case 'rating':
        orderBy = { averageRating: sortOrder };
        break;
      case 'jobsCompleted':
        orderBy = { totalJobsCompleted: sortOrder };
        break;
      default:
        orderBy = { createdAt: sortOrder };
    }

    // Get total count for pagination
    const totalCount = await prisma.teamMember.count({ where });

    // Get team members with pagination
    const teamMembers = await prisma.teamMember.findMany({
      where,
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
            lastLoginAt: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            assignedBookings: true,
            reviews: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      success: true,
      data: teamMembers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    });
  } catch (error) {
    console.error('GET /api/team error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/team - Create new team member
// ============================================
export async function POST(request: NextRequest) {
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

    // Only OWNER and ADMIN can create team members
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createTeamMemberSchema.parse(body);

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
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

    // Hash password
    const passwordHash = await hashPassword(validatedData.password);

    // Create user and team member in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user account
      const newUser = await tx.user.create({
        data: {
          email: validatedData.email.toLowerCase(),
          passwordHash,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName || null,
          phone: validatedData.phone || null,
          role: validatedData.role,
          companyId: user.companyId,
          isActive: true,
          isVerified: false,
        },
      });

      // Create team member profile
      const teamMember = await tx.teamMember.create({
        data: {
          userId: newUser.id,
          companyId: user.companyId,

          // Employment
          employeeId: validatedData.employeeId || null,
          hourlyRate: validatedData.hourlyRate || null,
          salary: validatedData.salary || null,
          payType: validatedData.payType,
          hireDate: validatedData.hireDate || null,

          // Address
          street: validatedData.street || null,
          city: validatedData.city || null,
          state: validatedData.state || null,
          zip: validatedData.zip || null,

          // Work Profile
          bio: validatedData.bio || null,
          specialties: validatedData.specialties,
          serviceAreas: validatedData.serviceAreas,
          serviceTypes: validatedData.serviceTypes,
          languages: validatedData.languages,
          yearsExperience: validatedData.yearsExperience || null,
          speed: validatedData.speed || null,

          // Scheduling
          availability: validatedData.availability ? JSON.stringify(validatedData.availability) : null,
          preferredHours: validatedData.preferredHours || null,
          maxJobsPerDay: validatedData.maxJobsPerDay || null,

          // Location
          locationId: validatedData.locationId || null,

          // Emergency Contact
          emergencyContactName: validatedData.emergencyContactName || null,
          emergencyContactPhone: validatedData.emergencyContactPhone || null,

          // Status
          isActive: true,
          isAvailable: true,

          // Initialize performance metrics
          averageRating: 0,
          totalJobsCompleted: 0,
          totalEarnings: 0,
          onTimePercentage: 100,
          customerSatisfaction: 0,
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

      return teamMember;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Team member created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/team error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create team member' },
      { status: 500 }
    );
  }
}
