import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Type definitions for checklist items
interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
  completedAt?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  required?: boolean;
}

interface ChecklistArea {
  name: string;
  items: ChecklistItem[];
}

interface ChecklistData {
  areas: ChecklistArea[];
}

// Helper function to calculate checklist stats
function calculateChecklistStats(items: ChecklistData | any): { totalTasks: number; completedTasks: number; percentComplete: number } {
  let totalTasks = 0;
  let completedTasks = 0;

  if (items?.areas && Array.isArray(items.areas)) {
    for (const area of items.areas) {
      if (area.items && Array.isArray(area.items)) {
        totalTasks += area.items.length;
        completedTasks += area.items.filter((item: ChecklistItem) => item.completed).length;
      }
    }
  } else if (typeof items === 'object' && items !== null) {
    // Handle legacy format where items is an object with area keys
    for (const areaKey of Object.keys(items)) {
      const areaItems = items[areaKey];
      if (Array.isArray(areaItems)) {
        totalTasks += areaItems.length;
        completedTasks += areaItems.filter((item: ChecklistItem) => item.completed).length;
      }
    }
  }

  return {
    totalTasks,
    completedTasks,
    percentComplete: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
  };
}

// Helper function to generate default checklist based on service type
function generateDefaultChecklist(serviceType: string): ChecklistData {
  const standardTasks: ChecklistArea[] = [
    {
      name: 'Kitchen',
      items: [
        { id: 'kitchen-1', task: 'Clean countertops', completed: false, required: true },
        { id: 'kitchen-2', task: 'Clean stovetop', completed: false, required: true },
        { id: 'kitchen-3', task: 'Clean microwave (inside and out)', completed: false, required: true },
        { id: 'kitchen-4', task: 'Wipe down appliances', completed: false, required: true },
        { id: 'kitchen-5', task: 'Clean sink', completed: false, required: true },
        { id: 'kitchen-6', task: 'Empty trash', completed: false, required: true },
        { id: 'kitchen-7', task: 'Mop floor', completed: false, required: true },
      ],
    },
    {
      name: 'Bathrooms',
      items: [
        { id: 'bath-1', task: 'Clean toilet (inside and out)', completed: false, required: true },
        { id: 'bath-2', task: 'Clean shower/tub', completed: false, required: true },
        { id: 'bath-3', task: 'Clean sink and counter', completed: false, required: true },
        { id: 'bath-4', task: 'Clean mirror', completed: false, required: true },
        { id: 'bath-5', task: 'Mop floor', completed: false, required: true },
        { id: 'bath-6', task: 'Empty trash', completed: false, required: true },
        { id: 'bath-7', task: 'Replace towels if needed', completed: false, required: false },
      ],
    },
    {
      name: 'Bedrooms',
      items: [
        { id: 'bed-1', task: 'Make beds', completed: false, required: true },
        { id: 'bed-2', task: 'Dust surfaces', completed: false, required: true },
        { id: 'bed-3', task: 'Vacuum/mop floors', completed: false, required: true },
        { id: 'bed-4', task: 'Empty trash', completed: false, required: true },
      ],
    },
    {
      name: 'Living Areas',
      items: [
        { id: 'living-1', task: 'Dust surfaces', completed: false, required: true },
        { id: 'living-2', task: 'Vacuum/mop floors', completed: false, required: true },
        { id: 'living-3', task: 'Clean mirrors and glass', completed: false, required: true },
        { id: 'living-4', task: 'Straighten cushions and pillows', completed: false, required: false },
      ],
    },
    {
      name: 'General',
      items: [
        { id: 'gen-1', task: 'Dust light fixtures', completed: false, required: false },
        { id: 'gen-2', task: 'Wipe door handles', completed: false, required: true },
        { id: 'gen-3', task: 'Check all areas before leaving', completed: false, required: true },
      ],
    },
  ];

  // Add deep cleaning tasks for deep clean service
  if (serviceType === 'DEEP') {
    standardTasks.push({
      name: 'Deep Cleaning',
      items: [
        { id: 'deep-1', task: 'Clean inside oven', completed: false, required: true },
        { id: 'deep-2', task: 'Clean inside refrigerator', completed: false, required: true },
        { id: 'deep-3', task: 'Clean baseboards', completed: false, required: true },
        { id: 'deep-4', task: 'Clean window sills', completed: false, required: true },
        { id: 'deep-5', task: 'Clean light switches and outlets', completed: false, required: true },
        { id: 'deep-6', task: 'Clean ceiling fans', completed: false, required: false },
        { id: 'deep-7', task: 'Clean behind appliances', completed: false, required: false },
      ],
    });
  }

  // Add move-specific tasks
  if (serviceType === 'MOVE_IN' || serviceType === 'MOVE_OUT') {
    standardTasks.push({
      name: 'Move Cleaning',
      items: [
        { id: 'move-1', task: 'Clean inside all cabinets', completed: false, required: true },
        { id: 'move-2', task: 'Clean inside all drawers', completed: false, required: true },
        { id: 'move-3', task: 'Clean inside closets', completed: false, required: true },
        { id: 'move-4', task: 'Clean inside oven', completed: false, required: true },
        { id: 'move-5', task: 'Clean inside refrigerator', completed: false, required: true },
        { id: 'move-6', task: 'Clean inside dishwasher', completed: false, required: true },
        { id: 'move-7', task: 'Clean all baseboards', completed: false, required: true },
        { id: 'move-8', task: 'Clean all windows (inside)', completed: false, required: true },
        { id: 'move-9', task: 'Clean garage (if applicable)', completed: false, required: false },
      ],
    });
  }

  return { areas: standardTasks };
}

// GET /api/cleaner/jobs/[id]/checklist - Get job checklist
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = params.id;

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only cleaners can access this endpoint
    if (user.role !== 'CLEANER') {
      return NextResponse.json({ error: 'Forbidden - Cleaner role required' }, { status: 403 });
    }

    // Get the cleaner's team member record
    const teamMember = await prisma.teamMember.findUnique({
      where: { userId: user.id },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member profile not found' }, { status: 404 });
    }

    // Get the booking with checklist
    const booking = await prisma.booking.findFirst({
      where: {
        id: jobId,
        assignedCleanerId: teamMember.id,
        companyId: user.companyId,
      },
      include: {
        checklist: true,
        service: {
          select: {
            type: true,
            includedTasks: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Job not found or not assigned to you' },
        { status: 404 }
      );
    }

    // If checklist exists, return it
    if (booking.checklist) {
      const stats = calculateChecklistStats(booking.checklist.items);

      return NextResponse.json({
        success: true,
        data: {
          id: booking.checklist.id,
          bookingId: jobId,
          items: booking.checklist.items,
          totalTasks: stats.totalTasks,
          completedTasks: stats.completedTasks,
          percentComplete: stats.percentComplete,
          startedAt: booking.checklist.startedAt,
          completedAt: booking.checklist.completedAt,
          createdAt: booking.checklist.createdAt,
          updatedAt: booking.checklist.updatedAt,
        },
      });
    }

    // Create a new checklist from template/default
    const serviceType = booking.serviceType || booking.service?.type || 'STANDARD';
    const defaultChecklist = generateDefaultChecklist(serviceType);
    const stats = calculateChecklistStats(defaultChecklist);

    const newChecklist = await prisma.jobChecklist.create({
      data: {
        bookingId: jobId,
        items: defaultChecklist as any,
        totalTasks: stats.totalTasks,
        completedTasks: 0,
        startedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newChecklist.id,
        bookingId: jobId,
        items: newChecklist.items,
        totalTasks: newChecklist.totalTasks,
        completedTasks: newChecklist.completedTasks,
        percentComplete: 0,
        startedAt: newChecklist.startedAt,
        completedAt: newChecklist.completedAt,
        createdAt: newChecklist.createdAt,
        updatedAt: newChecklist.updatedAt,
      },
    });
  } catch (error) {
    console.error('GET /api/cleaner/jobs/[id]/checklist error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to get checklist: ${error.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to get checklist' },
      { status: 500 }
    );
  }
}

// PUT /api/cleaner/jobs/[id]/checklist - Update checklist items
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = params.id;
    const body = await request.json();

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only cleaners can access this endpoint
    if (user.role !== 'CLEANER') {
      return NextResponse.json({ error: 'Forbidden - Cleaner role required' }, { status: 403 });
    }

    // Get the cleaner's team member record
    const teamMember = await prisma.teamMember.findUnique({
      where: { userId: user.id },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member profile not found' }, { status: 404 });
    }

    // Get the booking with checklist
    const booking = await prisma.booking.findFirst({
      where: {
        id: jobId,
        assignedCleanerId: teamMember.id,
        companyId: user.companyId,
      },
      include: {
        checklist: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Job not found or not assigned to you' },
        { status: 404 }
      );
    }

    if (!booking.checklist) {
      return NextResponse.json(
        { error: 'Checklist not found. Please get the checklist first.' },
        { status: 404 }
      );
    }

    // Handle different update modes
    const { items, itemId, areaName, updates } = body;

    let updatedItems: any = booking.checklist.items;

    if (items) {
      // Full checklist update
      updatedItems = items;
    } else if (itemId && updates) {
      // Single item update
      const currentItems = booking.checklist.items as unknown as ChecklistData;

      if (currentItems.areas && Array.isArray(currentItems.areas)) {
        for (const area of currentItems.areas) {
          const itemIndex = area.items.findIndex((item: ChecklistItem) => item.id === itemId);
          if (itemIndex !== -1) {
            // Apply updates
            if (updates.completed !== undefined) {
              area.items[itemIndex].completed = updates.completed;
              area.items[itemIndex].completedAt = updates.completed ? new Date().toISOString() : null;
            }
            if (updates.notes !== undefined) {
              area.items[itemIndex].notes = updates.notes;
            }
            if (updates.photoUrl !== undefined) {
              area.items[itemIndex].photoUrl = updates.photoUrl;
            }
            break;
          }
        }
        updatedItems = currentItems;
      } else {
        // Legacy format
        for (const areaKey of Object.keys(currentItems)) {
          const areaItems = (currentItems as any)[areaKey];
          if (Array.isArray(areaItems)) {
            const itemIndex = areaItems.findIndex((item: ChecklistItem) => item.id === itemId);
            if (itemIndex !== -1) {
              if (updates.completed !== undefined) {
                areaItems[itemIndex].completed = updates.completed;
                areaItems[itemIndex].completedAt = updates.completed ? new Date().toISOString() : null;
              }
              if (updates.notes !== undefined) {
                areaItems[itemIndex].notes = updates.notes;
              }
              if (updates.photoUrl !== undefined) {
                areaItems[itemIndex].photoUrl = updates.photoUrl;
              }
              break;
            }
          }
        }
        updatedItems = currentItems;
      }
    } else if (areaName && updates) {
      // Batch update for an area
      const currentItems = booking.checklist.items as unknown as ChecklistData;

      if (currentItems.areas && Array.isArray(currentItems.areas)) {
        const area = currentItems.areas.find((a: ChecklistArea) => a.name === areaName);
        if (area && updates.markAllComplete) {
          area.items = area.items.map((item: ChecklistItem) => ({
            ...item,
            completed: true,
            completedAt: new Date().toISOString(),
          }));
        }
        updatedItems = currentItems;
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid update format. Provide either "items", "itemId" with "updates", or "areaName" with "updates".' },
        { status: 400 }
      );
    }

    // Calculate new stats
    const stats = calculateChecklistStats(updatedItems);
    const isComplete = stats.completedTasks === stats.totalTasks && stats.totalTasks > 0;

    // Update the checklist
    const updatedChecklist = await prisma.jobChecklist.update({
      where: { id: booking.checklist.id },
      data: {
        items: updatedItems as any,
        totalTasks: stats.totalTasks,
        completedTasks: stats.completedTasks,
        completedAt: isComplete ? new Date() : null,
      },
    });

    console.log(`Checklist ${updatedChecklist.id} updated for job ${jobId} by cleaner ${user.id}`);

    return NextResponse.json({
      success: true,
      message: isComplete ? 'Checklist completed!' : 'Checklist updated successfully',
      data: {
        id: updatedChecklist.id,
        bookingId: jobId,
        items: updatedChecklist.items,
        totalTasks: stats.totalTasks,
        completedTasks: stats.completedTasks,
        percentComplete: stats.percentComplete,
        isComplete,
        startedAt: updatedChecklist.startedAt,
        completedAt: updatedChecklist.completedAt,
        updatedAt: updatedChecklist.updatedAt,
      },
    });
  } catch (error) {
    console.error('PUT /api/cleaner/jobs/[id]/checklist error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to update checklist: ${error.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update checklist' },
      { status: 500 }
    );
  }
}
