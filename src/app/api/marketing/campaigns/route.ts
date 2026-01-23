import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createCampaignSchema } from '@/lib/validations';

// Type assertion for new Campaign model (pre-migration compatibility)
// After running migration, this can be replaced with direct db.campaign calls
const db = prisma as any;

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/marketing/campaigns - List all campaigns
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user and check role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can access marketing
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Build where clause
    const where: any = {
      companyId: user.companyId,
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    // Fetch campaigns with pagination
    const [campaigns, totalCount] = await Promise.all([
      db.campaign.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              recipients: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.campaign.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        campaigns,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error('GET /api/marketing/campaigns error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// POST /api/marketing/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user and check role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can create campaigns
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createCampaignSchema.parse(body);

    // Validate that email campaigns have a subject
    if ((validatedData.type === 'BULK_EMAIL' || validatedData.type === 'BOTH') && !validatedData.subject) {
      return NextResponse.json(
        { success: false, error: 'Email campaigns require a subject' },
        { status: 400 }
      );
    }

    // Create the campaign
    const campaign = await db.campaign.create({
      data: {
        companyId: user.companyId,
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        segmentType: validatedData.segmentType,
        segmentData: validatedData.segmentData || null,
        subject: validatedData.subject,
        messageBody: validatedData.messageBody,
        scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : null,
        status: validatedData.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        createdById: session.user.id,
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
      if (db.auditLog) {
        await db.auditLog.create({
          data: {
            companyId: user.companyId,
            userId: session.user.id,
            action: 'CAMPAIGN_CREATED',
            description: `${user.name || 'User'} created campaign "${campaign.name}"`,
            entityType: 'Campaign',
            entityId: campaign.id,
            metadata: {
              campaignType: campaign.type,
              segmentType: campaign.segmentType,
            },
          },
        });
      }
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    return NextResponse.json({
      success: true,
      data: campaign,
      message: 'Campaign created successfully',
    });
  } catch (error) {
    console.error('POST /api/marketing/campaigns error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
