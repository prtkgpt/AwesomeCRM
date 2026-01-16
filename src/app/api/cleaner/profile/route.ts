import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/cleaner/profile - Get cleaner profile
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only allow cleaners to access
    if (user.role !== 'CLEANER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get TeamMember data
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: session.user.id },
      select: {
        id: true,
        street: true,
        city: true,
        state: true,
        zip: true,
        emergencyContact: true,
        emergencyPhone: true,
        hourlyRate: true,
        employeeId: true,
        experience: true,
        speed: true,
        serviceAreas: true,
        specialties: true,
      },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      companyName: user.company.name,
      // TeamMember fields
      street: teamMember?.street || '',
      city: teamMember?.city || '',
      state: teamMember?.state || '',
      zip: teamMember?.zip || '',
      emergencyContact: teamMember?.emergencyContact || '',
      emergencyPhone: teamMember?.emergencyPhone || '',
      hourlyRate: teamMember?.hourlyRate || '',
      employeeId: teamMember?.employeeId || '',
      experience: teamMember?.experience || '',
      speed: teamMember?.speed || 'Medium',
      serviceAreas: teamMember?.serviceAreas || [],
      specialties: teamMember?.specialties || [],
    });
  } catch (error) {
    console.error('🔴 GET /api/cleaner/profile error:', error);

    if (error instanceof Error && error.message) {
      console.error('🔴 Error message:', error.message);
      console.error('🔴 Error stack:', error.stack);
      return NextResponse.json({
        success: false,
        error: `Failed to fetch profile: ${error.message}`,
        details: error.stack
      }, { status: 500 });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile - unknown error' },
      { status: 500 }
    );
  }
}

// PUT /api/cleaner/profile - Update cleaner profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user || user.role !== 'CLEANER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      phone,
      street,
      city,
      state,
      zip,
      emergencyContact,
      emergencyPhone,
      experience,
      speed,
      serviceAreas,
      specialties,
    } = body;

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name || undefined,
        phone: phone || undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
      },
    });

    // Update or create TeamMember record
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: session.user.id },
    });

    if (teamMember) {
      // Update existing TeamMember
      await prisma.teamMember.update({
        where: { id: teamMember.id },
        data: {
          street: street || undefined,
          city: city || undefined,
          state: state || undefined,
          zip: zip || undefined,
          emergencyContact: emergencyContact || undefined,
          emergencyPhone: emergencyPhone || undefined,
          experience: experience || undefined,
          speed: speed || undefined,
          serviceAreas: serviceAreas || undefined,
          specialties: specialties || undefined,
        },
      });
    } else {
      // Create TeamMember if doesn't exist
      await prisma.teamMember.create({
        data: {
          companyId: user.companyId,
          userId: session.user.id,
          isActive: true,
          street: street || undefined,
          city: city || undefined,
          state: state || undefined,
          zip: zip || undefined,
          emergencyContact: emergencyContact || undefined,
          emergencyPhone: emergencyPhone || undefined,
          experience: experience || undefined,
          speed: speed || undefined,
          serviceAreas: serviceAreas || undefined,
          specialties: specialties || undefined,
        },
      });
    }

    return NextResponse.json({
      success: true,
      ...updatedUser,
    });
  } catch (error) {
    console.error('🔴 PUT /api/cleaner/profile error:', error);

    if (error instanceof Error && error.message) {
      console.error('🔴 Error message:', error.message);
      console.error('🔴 Error stack:', error.stack);

      // Check for specific Prisma errors
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json({
          success: false,
          error: 'Phone number already in use by another user'
        }, { status: 400 });
      }

      return NextResponse.json({
        success: false,
        error: `Failed to update profile: ${error.message}`,
        details: error.stack
      }, { status: 500 });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update profile - unknown error' },
      { status: 500 }
    );
  }
}
