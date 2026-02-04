import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/public/company/[slug] - Get public company info
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  // Rate limit: 60 requests per minute per IP (read-only endpoint)
  const rateLimited = checkRateLimit(request, 'publicCompanyInfo');
  if (rateLimited) return rateLimited;

  try {
    const { slug } = params;

    const company = await prisma.company.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        businessType: true,
        enabledFeatures: true,
      },
    });

    // Fetch pricing rules separately to handle if relation doesn't exist
    let pricingRules: any[] = [];
    try {
      pricingRules = await prisma.pricingRule.findMany({
        where: {
          companyId: company?.id,
          isActive: true,
        },
        orderBy: {
          sortOrder: 'asc',
        },
      });
    } catch (e) {
      // Pricing rules might not exist, that's ok
      console.log('No pricing rules found:', e);
    }

    const companyWithPricing = company ? { ...company, pricingRules } : null;

    if (!companyWithPricing) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: companyWithPricing,
    });
  } catch (error) {
    console.error('Get public company error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch company' },
      { status: 500 }
    );
  }
}
