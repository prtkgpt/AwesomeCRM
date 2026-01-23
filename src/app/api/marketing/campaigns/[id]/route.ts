import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateCampaignSchema } from '@/lib/validations';

// Type assertion for new Campaign model (pre-migration compatibility)
const db = prisma as any;

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/marketing/campaigns/[id] - Get campaign details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get user and check role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Fetch campaign with details
    const campaign = await db.campaign.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        recipients: {
          take: 100, // Limit for performance
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            recipients: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    // Get recipient status breakdown
    const statusBreakdown = await db.campaignRecipient.groupBy({
      by: ['status'],
      where: { campaignId: id },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...campaign,
        statusBreakdown: statusBreakdown.reduce((acc: Record<string, number>, item: any) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error('GET /api/marketing/campaigns/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

// PATCH /api/marketing/campaigns/[id] - Update campaign
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Check campaign exists and belongs to company
    const existingCampaign = await db.campaign.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    });

    if (!existingCampaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    // Only allow editing DRAFT or SCHEDULED campaigns
    if (!['DRAFT', 'SCHEDULED'].includes(existingCampaign.status)) {
      return NextResponse.json(
        { success: false, error: 'Cannot edit a campaign that has already been sent' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateCampaignSchema.parse(body);

    // Update the campaign
    const updatedCampaign = await db.campaign.update({
      where: { id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.type && { type: validatedData.type }),
        ...(validatedData.segmentType && { segmentType: validatedData.segmentType }),
        ...(validatedData.segmentData !== undefined && { segmentData: validatedData.segmentData }),
        ...(validatedData.subject !== undefined && { subject: validatedData.subject }),
        ...(validatedData.messageBody && { messageBody: validatedData.messageBody }),
        ...(validatedData.scheduledAt !== undefined && {
          scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : null,
          status: validatedData.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        }),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log the action (using db for pre-migration compatibility)
    try {
      await db.auditLog.create({
        data: {
          companyId: user.companyId,
          userId: session.user.id,
          action: 'CAMPAIGN_UPDATED',
          description: `${user.name || 'User'} updated campaign "${updatedCampaign.name}"`,
          entityType: 'Campaign',
          entityId: updatedCampaign.id,
        },
      });
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    return NextResponse.json({
      success: true,
      data: updatedCampaign,
      message: 'Campaign updated successfully',
    });
  } catch (error) {
    console.error('PATCH /api/marketing/campaigns/[id] error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

// DELETE /api/marketing/campaigns/[id] - Delete campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Only OWNER can delete campaigns
    if (user.role !== 'OWNER') {
      return NextResponse.json({ success: false, error: 'Only owners can delete campaigns' }, { status: 403 });
    }

    // Check campaign exists and belongs to company
    const campaign = await db.campaign.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    });

    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    // Delete the campaign (cascade will delete recipients)
    await db.campaign.delete({
      where: { id },
    });

    // Log the action (using db for pre-migration compatibility)
    try {
      await db.auditLog.create({
        data: {
          companyId: user.companyId,
          userId: session.user.id,
          action: 'CAMPAIGN_DELETED',
          description: `${user.name || 'User'} deleted campaign "${campaign.name}"`,
          entityType: 'Campaign',
          entityId: id,
        },
      });
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/marketing/campaigns/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
