import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateMessageTemplateSchema } from '@/lib/validations';

// GET /api/messages/templates - Get all message templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.messageTemplate.findMany({
      where: {
        userId: session.user.id,
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

    const updateData = updateMessageTemplateSchema.parse(validatedData);

    // Update or create template
    const template = await prisma.messageTemplate.upsert({
      where: {
        userId_type: {
          userId: session.user.id,
          type,
        },
      },
      update: updateData,
      create: {
        userId: session.user.id,
        type,
        name: updateData.name || type,
        template: updateData.template || '',
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
