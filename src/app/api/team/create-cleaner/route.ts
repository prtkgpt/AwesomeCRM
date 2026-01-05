import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const createCleanerSchema = z.object({
  // User fields
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.literal('CLEANER'),

  // TeamMember fields
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  hourlyRate: z.number().optional(),
  employeeId: z.string().optional(),
  experience: z.string().optional(),
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
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user and team member in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: validatedData.email,
          name: validatedData.name,
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
          emergencyContact: validatedData.emergencyContact,
          emergencyPhone: validatedData.emergencyPhone,
          // Employment
          hourlyRate: validatedData.hourlyRate,
          employeeId: validatedData.employeeId,
          // Work details
          experience: validatedData.experience,
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
        name: result.user.name,
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
