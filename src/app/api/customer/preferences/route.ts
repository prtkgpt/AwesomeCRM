import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET - Fetch customer's own preferences
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the client record for this user
    const client = await prisma.client.findFirst({
      where: { customerUserId: session.user.id },
      include: { preferences: true },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: client.preferences || null,
    });
  } catch (error) {
    console.error('Error fetching customer preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

// PUT - Update or create customer's own preferences
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the client record for this user
    const client = await prisma.client.findFirst({
      where: { customerUserId: session.user.id },
      include: { preferences: true },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client profile not found' },
        { status: 404 }
      );
    }

    const body = await req.json();

    // Remove any fields that shouldn't be updated directly
    const {
      id,
      clientId,
      createdAt,
      updatedAt,
      lastVisitNotes,
      lastVisitDate,
      ...preferenceData
    } = body;

    let preferences;

    if (client.preferences) {
      // Update existing preferences
      preferences = await prisma.clientPreference.update({
        where: { clientId: client.id },
        data: preferenceData,
      });
    } else {
      // Create new preferences
      preferences = await prisma.clientPreference.create({
        data: {
          clientId: client.id,
          ...preferenceData,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: preferences,
      message: 'Preferences saved successfully',
    });
  } catch (error) {
    console.error('Error saving customer preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save preferences' },
      { status: 500 }
    );
  }
}

// DELETE - Remove customer's own preferences
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the client record for this user
    const client = await prisma.client.findFirst({
      where: { customerUserId: session.user.id },
      include: { preferences: true },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client profile not found' },
        { status: 404 }
      );
    }

    if (!client.preferences) {
      return NextResponse.json(
        { success: false, error: 'No preferences to delete' },
        { status: 404 }
      );
    }

    await prisma.clientPreference.delete({
      where: { clientId: client.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Preferences deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting customer preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete preferences' },
      { status: 500 }
    );
  }
}
