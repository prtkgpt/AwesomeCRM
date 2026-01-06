import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      companyName: user.company.name,
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
      select: { role: true },
    });

    if (!user || user.role !== 'CLEANER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, phone } = body;

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
