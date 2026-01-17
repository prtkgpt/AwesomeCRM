import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateMessageTemplateSchema } from '@/lib/validations';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/messages/templates - Get all message templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const templates = await prisma.messageTemplate.findMany({
      where: {
        companyId: user.companyId,
      },
      orderBy: {
        type: 'asc',
      },
    });

    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error('GET /api/messages/templates error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// PUT /api/messages/templates - Update template (by type)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, ...validatedData } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Template type is required' },
        { status: 400 }
      );
    }

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData = updateMessageTemplateSchema.parse(validatedData);
    const channel = validatedData.channel || 'SMS';

    // Update or create template
    const template = await prisma.messageTemplate.upsert({
      where: {
        companyId_type_channel: {
          companyId: user.companyId,
          type,
          channel,
        },
      },
      update: updateData,
      create: {
        companyId: user.companyId,
        type,
        channel,
        name: updateData.name || type,
        body: updateData.body || '',
        isActive: updateData.isActive ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/messages/templates error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    );
  }
}
