import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/company/referral-settings
 * Fetch referral program settings (Owner only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role and company
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user || user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Forbidden - Owner only' },
        { status: 403 }
      );
    }

    if (!user.companyId) {
      return NextResponse.json(
        { error: 'No company associated with user' },
        { status: 400 }
      );
    }

    // Fetch company referral settings
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        referralEnabled: true,
        referralReferrerReward: true,
        referralRefereeReward: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        referralEnabled: company.referralEnabled || false,
        referralReferrerReward: company.referralReferrerReward || 25,
        referralRefereeReward: company.referralRefereeReward || 25,
      },
    });
  } catch (error) {
    console.error('Failed to fetch referral settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch referral settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/company/referral-settings
 * Update referral program settings (Owner only)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role and company
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user || user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Forbidden - Owner only' },
        { status: 403 }
      );
    }

    if (!user.companyId) {
      return NextResponse.json(
        { error: 'No company associated with user' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate settings
    const settings = {
      referralEnabled: body.referralEnabled === true,
      referralReferrerReward: parseFloat(body.referralReferrerReward) || 0,
      referralRefereeReward: parseFloat(body.referralRefereeReward) || 0,
    };

    // Check for negative values
    if (settings.referralReferrerReward < 0 || settings.referralRefereeReward < 0) {
      return NextResponse.json(
        { success: false, error: 'Reward amounts cannot be negative' },
        { status: 400 }
      );
    }

    // Update company referral settings
    const updatedCompany = await prisma.company.update({
      where: { id: user.companyId },
      data: settings,
      select: {
        referralEnabled: true,
        referralReferrerReward: true,
        referralRefereeReward: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Referral settings updated successfully',
      data: updatedCompany,
    });
  } catch (error) {
    console.error('Failed to update referral settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update referral settings' },
      { status: 500 }
    );
  }
}
