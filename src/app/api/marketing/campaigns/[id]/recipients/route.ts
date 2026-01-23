import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Type assertion for new Campaign model (pre-migration compatibility)
const db = prisma as any;

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Helper function to build recipient filter based on segment
async function getSegmentedClients(
  companyId: string,
  segmentType: string,
  segmentData: any,
  campaignType: string
) {
  // Base filter: company + not opted out + has contact info
  const baseWhere: any = {
    companyId,
    marketingOptOut: false,
  };

  // Require appropriate contact info based on campaign type
  if (campaignType === 'BULK_SMS') {
    baseWhere.phone = { not: null };
  } else if (campaignType === 'BULK_EMAIL') {
    baseWhere.email = { not: null };
  } else if (campaignType === 'BOTH') {
    baseWhere.OR = [
      { phone: { not: null } },
      { email: { not: null } },
    ];
  }

  // Apply segment-specific filters
  switch (segmentType) {
    case 'TAGS':
      if (segmentData?.tags && segmentData.tags.length > 0) {
        baseWhere.tags = { hasSome: segmentData.tags };
      }
      break;

    case 'INACTIVE':
      if (segmentData?.inactiveDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - segmentData.inactiveDays);

        // Get clients whose last booking was before cutoff
        const activeClientIds = await prisma.booking.findMany({
          where: {
            companyId,
            scheduledDate: { gte: cutoffDate },
            status: { in: ['COMPLETED', 'CLEANER_COMPLETED', 'SCHEDULED'] },
          },
          select: { clientId: true },
          distinct: ['clientId'],
        });

        const activeIds = activeClientIds.map((b) => b.clientId);
        if (activeIds.length > 0) {
          baseWhere.id = { notIn: activeIds };
        }
      }
      break;

    case 'LOCATION':
      // Filter by cities or states via addresses
      if (segmentData?.cities || segmentData?.states) {
        const addressFilters: any = {};
        if (segmentData.cities?.length > 0) {
          addressFilters.city = { in: segmentData.cities, mode: 'insensitive' };
        }
        if (segmentData.states?.length > 0) {
          addressFilters.state = { in: segmentData.states, mode: 'insensitive' };
        }

        // Get client IDs with matching addresses
        const matchingAddresses = await prisma.address.findMany({
          where: {
            client: { companyId },
            ...addressFilters,
          },
          select: { clientId: true },
          distinct: ['clientId'],
        });

        const clientIds = matchingAddresses.map((a) => a.clientId);
        if (clientIds.length > 0) {
          baseWhere.id = { in: clientIds };
        } else {
          // No matches, return empty
          baseWhere.id = { in: [] };
        }
      }
      break;

    case 'INSURANCE':
      if (segmentData?.hasInsurance !== undefined) {
        baseWhere.hasInsurance = segmentData.hasInsurance;
      }
      break;

    case 'BOOKING_FREQUENCY':
      // This would require more complex logic to calculate booking frequency
      // For now, use tags that indicate frequency
      if (segmentData?.bookingFrequency) {
        const frequencyTag = segmentData.bookingFrequency.toLowerCase();
        baseWhere.tags = { has: frequencyTag };
      }
      break;

    case 'ALL':
    default:
      // No additional filters
      break;
  }

  // Use db (as any) for pre-migration compatibility with marketingOptOut field
  return db.client.findMany({
    where: baseWhere,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      tags: true,
      hasInsurance: true,
      marketingOptOut: true,
      addresses: {
        select: {
          city: true,
          state: true,
        },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  });
}

// GET /api/marketing/campaigns/[id]/recipients - Preview recipients
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

    // Get the campaign
    const campaign = await db.campaign.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    });

    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    // Get matching clients based on segment
    const clients = await getSegmentedClients(
      user.companyId,
      campaign.segmentType,
      campaign.segmentData,
      campaign.type
    );

    // Calculate contact availability
    const withEmail = clients.filter((c: any) => c.email).length;
    const withPhone = clients.filter((c: any) => c.phone).length;
    const withBoth = clients.filter((c: any) => c.email && c.phone).length;

    // Parse query params for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const preview = searchParams.get('preview') === 'true';

    // If just previewing count, return early
    if (preview) {
      return NextResponse.json({
        success: true,
        data: {
          totalCount: clients.length,
          withEmail,
          withPhone,
          withBoth,
          campaignType: campaign.type,
          segmentType: campaign.segmentType,
        },
      });
    }

    // Paginate the full list
    const paginatedClients = clients.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      success: true,
      data: {
        recipients: paginatedClients,
        pagination: {
          page,
          limit,
          totalCount: clients.length,
          totalPages: Math.ceil(clients.length / limit),
        },
        stats: {
          withEmail,
          withPhone,
          withBoth,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/marketing/campaigns/[id]/recipients error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recipients' },
      { status: 500 }
    );
  }
}

// Note: getSegmentedClients is duplicated in the send route since
// Next.js route files cannot export helper functions
