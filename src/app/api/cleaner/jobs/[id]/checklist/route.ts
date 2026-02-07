import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getChecklistTemplate, calculateChecklistStats, ChecklistTemplate } from '@/lib/checklist-templates';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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

    const bookingId = params.id;

    // Get user's company for multi-tenant scoping
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get the booking to verify it exists, belongs to company, and is assigned to this cleaner
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, companyId: user.companyId },
      include: {
        assignee: {
          select: {
            userId: true,
          },
        },
        checklist: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify this cleaner is assigned to this job
    if (booking.assignee?.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You are not assigned to this job' },
        { status: 403 }
      );
    }

    // If checklist already exists, return it
    if (booking.checklist) {
      const stats = calculateChecklistStats(booking.checklist.checklistData as unknown as ChecklistTemplate);

      return NextResponse.json({
        success: true,
        data: {
          id: booking.checklist.id,
          checklistData: booking.checklist.checklistData,
          totalTasks: booking.checklist.totalTasks,
          completedTasks: booking.checklist.completedTasks,
          percentComplete: stats.percentComplete,
          startedAt: booking.checklist.startedAt,
          completedAt: booking.checklist.completedAt,
        },
      });
    }

    // Otherwise, create a new checklist from template
    const template = getChecklistTemplate(booking.serviceType);
    const stats = calculateChecklistStats(template);

    const newChecklist = await prisma.jobChecklist.create({
      data: {
        bookingId: bookingId,
        checklistData: template as any,
        totalTasks: stats.totalTasks,
        completedTasks: 0,
        startedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newChecklist.id,
        checklistData: newChecklist.checklistData,
        totalTasks: newChecklist.totalTasks,
        completedTasks: newChecklist.completedTasks,
        percentComplete: 0,
        startedAt: newChecklist.startedAt,
        completedAt: newChecklist.completedAt,
      },
    });
  } catch (error) {
    console.error('Failed to get checklist:', error);
    return NextResponse.json(
      { error: 'Failed to get checklist' },
      { status: 500 }
    );
  }
}

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

    const bookingId = params.id;
    const body = await req.json();
    const { checklistData } = body;

    if (!checklistData) {
      return NextResponse.json(
        { error: 'Checklist data is required' },
        { status: 400 }
      );
    }

    // Get user's company for multi-tenant scoping
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get the booking to verify access and company scope
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, companyId: user.companyId },
      include: {
        assignee: {
          select: {
            userId: true,
          },
        },
        checklist: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify this cleaner is assigned to this job
    if (booking.assignee?.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You are not assigned to this job' },
        { status: 403 }
      );
    }

    if (!booking.checklist) {
      return NextResponse.json(
        { error: 'Checklist not found' },
        { status: 404 }
      );
    }

    // Calculate stats
    const stats = calculateChecklistStats(checklistData as unknown as ChecklistTemplate);
    const isComplete = stats.completedTasks === stats.totalTasks && stats.totalTasks > 0;

    // Update the checklist
    const updatedChecklist = await prisma.jobChecklist.update({
      where: { id: booking.checklist.id },
      data: {
        checklistData: checklistData as any,
        totalTasks: stats.totalTasks,
        completedTasks: stats.completedTasks,
        completedAt: isComplete ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedChecklist.id,
        checklistData: updatedChecklist.checklistData,
        totalTasks: updatedChecklist.totalTasks,
        completedTasks: updatedChecklist.completedTasks,
        percentComplete: stats.percentComplete,
        startedAt: updatedChecklist.startedAt,
        completedAt: updatedChecklist.completedAt,
      },
    });
  } catch (error) {
    console.error('Failed to update checklist:', error);
    return NextResponse.json(
      { error: 'Failed to update checklist' },
      { status: 500 }
    );
  }
}
