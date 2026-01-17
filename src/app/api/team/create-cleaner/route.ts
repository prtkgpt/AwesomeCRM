import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const createCleanerSchema = z.object({
  // User fields
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.literal('CLEANER'),

  // TeamMember fields
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  hourlyRate: z.number().optional(),
  employeeId: z.string().optional(),
  yearsExperience: z.number().int().optional(),
  speed: z.string().optional(),
  serviceAreas: z.array(z.string()).optional(),
  specialties: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is OWNER or ADMIN
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!currentUser || (currentUser.role !== 'OWNER' && currentUser.role !== 'ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Only owners and admins can create cleaner accounts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createCleanerSchema.parse(body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
      include: { teamMember: true },
    });

    // If user exists and is deactivated, reactivate them
    if (existingUser) {
      // Check if user belongs to the same company
      if (existingUser.companyId !== currentUser.companyId) {
        return NextResponse.json(
          { success: false, error: 'An account with this email already exists in another company' },
          { status: 400 }
        );
      }

      // If user is active, return error
      if (existingUser.teamMember?.isActive) {
        return NextResponse.json(
          { success: false, error: 'An account with this email already exists and is active' },
          { status: 400 }
        );
      }

      // Reactivate deactivated account and update password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      const result = await prisma.$transaction(async (tx) => {
        // Update user
        const updatedUser = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            firstName: validatedData.firstName,
            lastName: validatedData.lastName,
            phone: validatedData.phone,
            passwordHash: hashedPassword,
          },
        });

        // Update team member - reactivate and update details
        const teamMember = await tx.teamMember.update({
          where: { userId: existingUser.id },
          data: {
            isActive: true,
            street: validatedData.street,
            city: validatedData.city,
            state: validatedData.state,
            zip: validatedData.zip,
            emergencyContactName: validatedData.emergencyContactName,
            emergencyContactPhone: validatedData.emergencyContactPhone,
            hourlyRate: validatedData.hourlyRate,
            employeeId: validatedData.employeeId,
            yearsExperience: validatedData.yearsExperience,
            speed: validatedData.speed,
            serviceAreas: validatedData.serviceAreas || [],
            specialties: validatedData.specialties || [],
          },
        });

        return { user: updatedUser, teamMember };
      });

      return NextResponse.json({
        success: true,
        data: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
        },
        message: 'Cleaner account reactivated successfully',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user and team member in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: validatedData.email,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          phone: validatedData.phone,
          passwordHash: hashedPassword,
          role: 'CLEANER',
          companyId: currentUser.companyId,
        },
      });

      // Create team member profile with all details
      const teamMember = await tx.teamMember.create({
        data: {
          userId: newUser.id,
          companyId: currentUser.companyId,
          isActive: true,
          // Address
          street: validatedData.street,
          city: validatedData.city,
          state: validatedData.state,
          zip: validatedData.zip,
          // Emergency contact
          emergencyContactName: validatedData.emergencyContactName,
          emergencyContactPhone: validatedData.emergencyContactPhone,
          // Employment
          hourlyRate: validatedData.hourlyRate,
          employeeId: validatedData.employeeId,
          // Work details
          yearsExperience: validatedData.yearsExperience,
          speed: validatedData.speed,
          serviceAreas: validatedData.serviceAreas || [],
          specialties: validatedData.specialties || [],
        },
      });

      return { user: newUser, teamMember };
    });

    return NextResponse.json({
      success: true,
      data: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
      },
      message: 'Cleaner account created successfully',
    });
  } catch (error: any) {
    console.error('POST /api/team/create-cleaner error:', error);

    if (error.name === 'ZodError') {
      const zodError = error as z.ZodError;
      const fieldErrors = zodError.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json(
        { success: false, error: fieldErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create cleaner account' },
      { status: 500 }
    );
  }
}
