import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Validation schema for updating quality checks
const updateQualityCheckSchema = z.object({
  status: z.enum(['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'PASSED', 'FAILED', 'NEEDS_ATTENTION']).optional(),
  checkerId: z.string().optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),

  // Scores (1-5)
  overallScore: z.number().int().min(1).max(5).optional().nullable(),
  thoroughnessScore: z.number().int().min(1).max(5).optional().nullable(),
  attentionToDetailScore: z.number().int().min(1).max(5).optional().nullable(),
  timeManagementScore: z.number().int().min(1).max(5).optional().nullable(),

  // Checklist results - JSON structure
  // { area: { item: { passed: boolean, notes: string, photoUrl: string } } }
  checklistResults: z.record(z.record(z.object({
    passed: z.boolean(),
    notes: z.string().optional(),
    photoUrl: z.string().optional(),
  }))).optional().nullable(),

  // Issues found - array of issues
  // [{ area, description, severity, photoUrl }]
  issues: z.array(z.object({
    area: z.string(),
    description: z.string(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    photoUrl: z.string().optional(),
  })).optional().nullable(),

  // Notes
  notes: z.string().optional().nullable(),
  cleanerFeedback: z.string().optional().nullable(),

  // Follow-up
  requiresFollowUp: z.boolean().optional(),
  followUpNotes: z.string().optional().nullable(),
  followUpCompletedAt: z.string().datetime().optional().nullable(),
});

// GET /api/quality/checks/[id] - Get quality check details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can view quality checks
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const qualityCheck = await prisma.qualityCheck.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            scheduledDate: true,
            scheduledEndDate: true,
            status: true,
            serviceType: true,
            duration: true,
            actualDuration: true,
            customerRating: true,
            customerFeedback: true,
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            address: {
              select: {
                id: true,
                street: true,
                unit: true,
                city: true,
                state: true,
                zip: true,
                propertyType: true,
                squareFootage: true,
                bedrooms: true,
                bathrooms: true,
              },
            },
            photos: {
              select: {
                id: true,
                type: true,
                area: true,
                url: true,
                caption: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        cleaner: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            averageRating: true,
            totalJobsCompleted: true,
            onTimePercentage: true,
            customerSatisfaction: true,
            specialties: true,
          },
        },
        checker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!qualityCheck) {
      return NextResponse.json(
        { success: false, error: 'Quality check not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: qualityCheck,
    });
  } catch (error) {
    console.error('GET /api/quality/checks/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quality check' },
      { status: 500 }
    );
  }
}

// PATCH /api/quality/checks/[id] - Update quality check (add scores, photos, notes)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can update quality checks
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the quality check exists and belongs to the company
    const existingQualityCheck = await prisma.qualityCheck.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!existingQualityCheck) {
      return NextResponse.json(
        { success: false, error: 'Quality check not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateQualityCheckSchema.parse(body);

    // If checkerId is being updated, verify it exists
    if (validatedData.checkerId) {
      const checker = await prisma.user.findFirst({
        where: {
          id: validatedData.checkerId,
          companyId: user.companyId,
          role: { in: ['OWNER', 'ADMIN'] },
        },
      });

      if (!checker) {
        return NextResponse.json(
          { success: false, error: 'Checker not found or does not have permission' },
          { status: 404 }
        );
      }
    }

    // Build update data
    const updateData: any = {};

    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
    }
    if (validatedData.checkerId !== undefined) {
      updateData.checkerId = validatedData.checkerId;
    }
    if (validatedData.scheduledAt !== undefined) {
      updateData.scheduledAt = validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : null;
    }
    if (validatedData.completedAt !== undefined) {
      updateData.completedAt = validatedData.completedAt ? new Date(validatedData.completedAt) : null;
    }
    if (validatedData.overallScore !== undefined) {
      updateData.overallScore = validatedData.overallScore;
    }
    if (validatedData.thoroughnessScore !== undefined) {
      updateData.thoroughnessScore = validatedData.thoroughnessScore;
    }
    if (validatedData.attentionToDetailScore !== undefined) {
      updateData.attentionToDetailScore = validatedData.attentionToDetailScore;
    }
    if (validatedData.timeManagementScore !== undefined) {
      updateData.timeManagementScore = validatedData.timeManagementScore;
    }
    if (validatedData.checklistResults !== undefined) {
      updateData.checklistResults = validatedData.checklistResults;
    }
    if (validatedData.issues !== undefined) {
      updateData.issues = validatedData.issues;
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }
    if (validatedData.cleanerFeedback !== undefined) {
      updateData.cleanerFeedback = validatedData.cleanerFeedback;
    }
    if (validatedData.requiresFollowUp !== undefined) {
      updateData.requiresFollowUp = validatedData.requiresFollowUp;
    }
    if (validatedData.followUpNotes !== undefined) {
      updateData.followUpNotes = validatedData.followUpNotes;
    }
    if (validatedData.followUpCompletedAt !== undefined) {
      updateData.followUpCompletedAt = validatedData.followUpCompletedAt
        ? new Date(validatedData.followUpCompletedAt)
        : null;
    }

    // Auto-set completedAt when status changes to PASSED or FAILED
    if (validatedData.status === 'PASSED' || validatedData.status === 'FAILED') {
      if (!updateData.completedAt && !existingQualityCheck.completedAt) {
        updateData.completedAt = new Date();
      }
    }

    // Auto-assign checker if not assigned and performing update
    if (!existingQualityCheck.checkerId && !updateData.checkerId) {
      updateData.checkerId = session.user.id;
    }

    // Update the quality check
    const qualityCheck = await prisma.qualityCheck.update({
      where: { id: params.id },
      data: updateData,
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            scheduledDate: true,
            status: true,
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        cleaner: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        checker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // If quality check is completed, update cleaner's performance metrics
    if (validatedData.status === 'PASSED' || validatedData.status === 'FAILED') {
      // Calculate average scores for this cleaner
      const cleanerChecks = await prisma.qualityCheck.findMany({
        where: {
          cleanerId: existingQualityCheck.cleanerId,
          status: { in: ['PASSED', 'FAILED'] },
          overallScore: { not: null },
        },
        select: {
          overallScore: true,
        },
      });

      if (cleanerChecks.length > 0) {
        const avgScore = cleanerChecks.reduce((sum, c) => sum + (c.overallScore || 0), 0) / cleanerChecks.length;

        // Update cleaner's customer satisfaction metric
        await prisma.teamMember.update({
          where: { id: existingQualityCheck.cleanerId },
          data: {
            customerSatisfaction: avgScore,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: qualityCheck,
      message: 'Quality check updated successfully',
    });
  } catch (error) {
    console.error('PATCH /api/quality/checks/[id] error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update quality check' },
      { status: 500 }
    );
  }
}
