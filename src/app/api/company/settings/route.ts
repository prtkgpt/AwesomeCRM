import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateCompanySettingsSchema = z.object({
  name: z.string().min(1, 'Company name is required').optional(),
  emailDomain: z.string().optional(),
  twilioAccountSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
  twilioPhoneNumber: z.string().optional(),
  resendApiKey: z.string().optional(),
});

// GET /api/company/settings - Get company settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        companyId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Only OWNER and ADMIN can view company settings
    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        id: true,
        name: true,
        emailDomain: true,
        twilioAccountSid: true,
        twilioPhoneNumber: true,
        resendApiKey: true,
        createdAt: true,
        // Don't send auth tokens for security
      },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...company,
        // Mask sensitive data
        twilioAccountSid: company.twilioAccountSid ? '••••••••' + company.twilioAccountSid.slice(-4) : null,
        resendApiKey: company.resendApiKey ? '••••••••' + company.resendApiKey.slice(-4) : null,
      },
    });
  } catch (error) {
    console.error('Get company settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch company settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/company/settings - Update company settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        companyId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Only OWNER can update company settings
    if (user.role !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: 'Only company owner can update settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateCompanySettingsSchema.parse(body);

    // Check if company name is being changed and if it's already in use
    if (validatedData.name) {
      const existingCompany = await prisma.company.findFirst({
        where: {
          name: validatedData.name,
          NOT: {
            id: user.companyId,
          },
        },
      });

      if (existingCompany) {
        return NextResponse.json(
          { success: false, error: 'Company name is already in use' },
          { status: 400 }
        );
      }
    }

    // Build update data - only include non-empty values for API keys
    const updateData: any = {};

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }
    if (validatedData.emailDomain !== undefined) {
      updateData.emailDomain = validatedData.emailDomain || null;
    }

    // Only update API credentials if they're not masked values
    if (validatedData.twilioAccountSid && !validatedData.twilioAccountSid.startsWith('••')) {
      updateData.twilioAccountSid = validatedData.twilioAccountSid;
    }
    if (validatedData.twilioAuthToken && !validatedData.twilioAuthToken.startsWith('••')) {
      updateData.twilioAuthToken = validatedData.twilioAuthToken;
    }
    if (validatedData.twilioPhoneNumber !== undefined) {
      updateData.twilioPhoneNumber = validatedData.twilioPhoneNumber || null;
    }
    if (validatedData.resendApiKey && !validatedData.resendApiKey.startsWith('••')) {
      updateData.resendApiKey = validatedData.resendApiKey;
    }

    // Update company settings
    const updatedCompany = await prisma.company.update({
      where: { id: user.companyId },
      data: updateData,
      select: {
        id: true,
        name: true,
        emailDomain: true,
        twilioAccountSid: true,
        twilioPhoneNumber: true,
        resendApiKey: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedCompany,
        // Mask sensitive data in response
        twilioAccountSid: updatedCompany.twilioAccountSid ? '••••••••' + updatedCompany.twilioAccountSid.slice(-4) : null,
        resendApiKey: updatedCompany.resendApiKey ? '••••••••' + updatedCompany.resendApiKey.slice(-4) : null,
      },
      message: 'Company settings updated successfully',
    });
  } catch (error) {
    console.error('Update company settings error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update company settings' },
      { status: 500 }
    );
  }
}
