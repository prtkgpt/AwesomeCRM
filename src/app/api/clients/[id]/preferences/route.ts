import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET - Fetch client preferences
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const clientId = params.id;

    // Get client with preferences
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        preferences: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // If no preferences exist yet, return empty object
    if (!client.preferences) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: client.preferences,
    });
  } catch (error) {
    console.error('Failed to fetch client preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

// PUT - Update or create client preferences
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const clientId = params.id;
    const body = await req.json();

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        preferences: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Update or create preferences
    let preferences;
    if (client.preferences) {
      // Update existing
      preferences = await prisma.clientPreference.update({
        where: { clientId: clientId },
        data: {
          cleaningSequence: body.cleaningSequence || null,
          priorityAreas: body.priorityAreas || body.areasToFocus || null,
          areasToAvoid: body.areasToAvoid || null,
          productAllergies: body.productAllergies || null,
          preferredProducts: body.preferredProducts || null,
          avoidScents: body.avoidScents || false,
          scentPreferences: body.scentPreferences || null,
          petHandlingInstructions: body.petHandlingInstructions || null,
          petFeedingRequired: body.petFeedingRequired || body.petFeedingNeeded || false,
          petFeedingInstructions: body.petFeedingInstructions || null,
          languagePreference: body.languagePreference || null,
          communicationNotes: body.communicationNotes || body.thingsToKnow || null,
          temperaturePreference: body.temperaturePreference || body.temperaturePreferences || null,
          doNotDisturb: body.doNotDisturb || null,
          otherTasks: body.otherTasks || body.specialRequests || null,
          lastVisitNotes: body.lastVisitNotes || null,
          lastVisitDate: body.lastVisitDate ? new Date(body.lastVisitDate) : null,
        },
      });
    } else {
      // Create new
      preferences = await prisma.clientPreference.create({
        data: {
          clientId: clientId,
          cleaningSequence: body.cleaningSequence || null,
          priorityAreas: body.priorityAreas || body.areasToFocus || null,
          areasToAvoid: body.areasToAvoid || null,
          productAllergies: body.productAllergies || null,
          preferredProducts: body.preferredProducts || null,
          avoidScents: body.avoidScents || false,
          scentPreferences: body.scentPreferences || null,
          petHandlingInstructions: body.petHandlingInstructions || null,
          petFeedingRequired: body.petFeedingRequired || body.petFeedingNeeded || false,
          petFeedingInstructions: body.petFeedingInstructions || null,
          languagePreference: body.languagePreference || null,
          communicationNotes: body.communicationNotes || body.thingsToKnow || null,
          temperaturePreference: body.temperaturePreference || body.temperaturePreferences || null,
          doNotDisturb: body.doNotDisturb || null,
          otherTasks: body.otherTasks || body.specialRequests || null,
          lastVisitNotes: body.lastVisitNotes || null,
          lastVisitDate: body.lastVisitDate ? new Date(body.lastVisitDate) : null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Failed to update client preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

// DELETE - Remove client preferences
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const clientId = params.id;

    // Check if preferences exist
    const existing = await prisma.clientPreference.findUnique({
      where: { clientId: clientId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Preferences not found' },
        { status: 404 }
      );
    }

    await prisma.clientPreference.delete({
      where: { clientId: clientId },
    });

    return NextResponse.json({
      success: true,
      message: 'Preferences deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete client preferences:', error);
    return NextResponse.json(
      { error: 'Failed to delete preferences' },
      { status: 500 }
    );
  }
}
