import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const updateCompanySettingsSchema = z.object({
  name: z.string().min(1, 'Company name is required').optional(),
  emailDomain: z.string().optional(),
  baseHourlyRate: z.number().min(0, 'Hourly rate must be positive').optional(),
  googleReviewUrl: z.string().optional(),
  yelpReviewUrl: z.string().optional(),
  twilioAccountSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
  twilioPhoneNumber: z.string().optional(),
  resendApiKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),
  stripePublishableKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
  timezone: z.string().optional(),
  // Reminder settings
  customerReminderEnabled: z.boolean().optional(),
  cleanerReminderEnabled: z.boolean().optional(),
  customerReminderHours: z.number().min(1).max(72).optional(),
  cleanerReminderHours: z.number().min(1).max(72).optional(),
  morningReminderEnabled: z.boolean().optional(),
  morningReminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  // Online Booking settings
  onlineBookingEnabled: z.boolean().optional(),
  minimumLeadTime: z.number().min(0).max(168).optional(), // Max 7 days
  maximumLeadTime: z.number().min(1).max(365).optional(), // Max 1 year
  // Backward compatibility field names
  minimumLeadTimeHours: z.number().min(0).max(168).optional(),
  maxDaysAhead: z.number().min(1).max(365).optional(),
  requireApproval: z.boolean().optional(),
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
        slug: true,
        emailDomain: true,
        baseHourlyRate: true,
        googleReviewUrl: true,
        yelpReviewUrl: true,
        twilioAccountSid: true,
        twilioPhoneNumber: true,
        resendApiKey: true,
        stripeSecretKey: true,
        stripePublishableKey: true,
        stripeWebhookSecret: true,
        customerReminderEnabled: true,
        cleanerReminderEnabled: true,
        customerReminderHours: true,
        cleanerReminderHours: true,
        morningReminderEnabled: true,
        morningReminderTime: true,
        onlineBookingEnabled: true,
        minimumLeadTime: true,
        maximumLeadTime: true,
        requireApproval: true,
        businessTypes: true,
        features: true,
        timezone: true,
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
        stripeSecretKey: company.stripeSecretKey ? '••••••••' + company.stripeSecretKey.slice(-4) : null,
        stripeWebhookSecret: company.stripeWebhookSecret ? '••••••••' + company.stripeWebhookSecret.slice(-4) : null,
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
    if (validatedData.baseHourlyRate !== undefined) {
      updateData.baseHourlyRate = validatedData.baseHourlyRate;
    }
    if (validatedData.googleReviewUrl !== undefined) {
      updateData.googleReviewUrl = validatedData.googleReviewUrl || null;
    }
    if (validatedData.yelpReviewUrl !== undefined) {
      updateData.yelpReviewUrl = validatedData.yelpReviewUrl || null;
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
    if (validatedData.stripeSecretKey && !validatedData.stripeSecretKey.startsWith('••')) {
      updateData.stripeSecretKey = validatedData.stripeSecretKey;
    }
    if (validatedData.stripePublishableKey !== undefined) {
      updateData.stripePublishableKey = validatedData.stripePublishableKey || null;
    }
    if (validatedData.stripeWebhookSecret && !validatedData.stripeWebhookSecret.startsWith('••')) {
      updateData.stripeWebhookSecret = validatedData.stripeWebhookSecret;
    }

    // Timezone
    if (validatedData.timezone !== undefined) {
      updateData.timezone = validatedData.timezone;
    }

    // Reminder settings
    if (validatedData.customerReminderEnabled !== undefined) {
      updateData.customerReminderEnabled = validatedData.customerReminderEnabled;
    }
    if (validatedData.cleanerReminderEnabled !== undefined) {
      updateData.cleanerReminderEnabled = validatedData.cleanerReminderEnabled;
    }
    if (validatedData.customerReminderHours !== undefined) {
      updateData.customerReminderHours = validatedData.customerReminderHours;
    }
    if (validatedData.cleanerReminderHours !== undefined) {
      updateData.cleanerReminderHours = validatedData.cleanerReminderHours;
    }
    if (validatedData.morningReminderEnabled !== undefined) {
      updateData.morningReminderEnabled = validatedData.morningReminderEnabled;
    }
    if (validatedData.morningReminderTime !== undefined) {
      updateData.morningReminderTime = validatedData.morningReminderTime;
    }

    // Online Booking settings
    if (validatedData.onlineBookingEnabled !== undefined) {
      updateData.onlineBookingEnabled = validatedData.onlineBookingEnabled;
    }
    // Handle both new and old field names for backward compatibility
    if (validatedData.minimumLeadTime !== undefined) {
      updateData.minimumLeadTime = validatedData.minimumLeadTime;
    } else if (validatedData.minimumLeadTimeHours !== undefined) {
      updateData.minimumLeadTime = validatedData.minimumLeadTimeHours;
    }
    if (validatedData.maximumLeadTime !== undefined) {
      updateData.maximumLeadTime = validatedData.maximumLeadTime;
    } else if (validatedData.maxDaysAhead !== undefined) {
      updateData.maximumLeadTime = validatedData.maxDaysAhead;
    }
    if (validatedData.requireApproval !== undefined) {
      updateData.requireApproval = validatedData.requireApproval;
    }

    // Update company settings
    const updatedCompany = await prisma.company.update({
      where: { id: user.companyId },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        emailDomain: true,
        baseHourlyRate: true,
        googleReviewUrl: true,
        yelpReviewUrl: true,
        twilioAccountSid: true,
        twilioPhoneNumber: true,
        resendApiKey: true,
        stripeSecretKey: true,
        stripePublishableKey: true,
        stripeWebhookSecret: true,
        customerReminderEnabled: true,
        cleanerReminderEnabled: true,
        customerReminderHours: true,
        cleanerReminderHours: true,
        morningReminderEnabled: true,
        morningReminderTime: true,
        onlineBookingEnabled: true,
        minimumLeadTime: true,
        maximumLeadTime: true,
        requireApproval: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedCompany,
        // Mask sensitive data in response
        twilioAccountSid: updatedCompany.twilioAccountSid ? '••••••••' + updatedCompany.twilioAccountSid.slice(-4) : null,
        resendApiKey: updatedCompany.resendApiKey ? '••••••••' + updatedCompany.resendApiKey.slice(-4) : null,
        stripeSecretKey: updatedCompany.stripeSecretKey ? '••••••••' + updatedCompany.stripeSecretKey.slice(-4) : null,
        stripeWebhookSecret: updatedCompany.stripeWebhookSecret ? '••••••••' + updatedCompany.stripeWebhookSecret.slice(-4) : null,
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

    // Return more specific error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to update company settings: ${errorMessage}` },
      { status: 500 }
    );
  }
}
