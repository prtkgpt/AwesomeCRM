import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const updateCompanySettingsSchema = z.object({
  name: z.string().min(1, 'Company name is required').optional(),
  emailDomain: z.string().optional(),
  hourlyRate: z.number().min(0, 'Hourly rate must be positive').optional(),
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
  enableCustomerReminders: z.boolean().optional(),
  enableCleanerReminders: z.boolean().optional(),
  customerReminderHours: z.number().min(1).max(72).optional(),
  cleanerReminderHours: z.number().min(1).max(72).optional(),
  enableMorningOfReminder: z.boolean().optional(),
  morningOfReminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  // Online Booking settings
  onlineBookingEnabled: z.boolean().optional(),
  minimumLeadTimeHours: z.number().min(0).max(168).optional(), // Max 7 days
  maxDaysAhead: z.number().min(1).max(365).optional(), // Max 1 year
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

    // Ensure user has a company
    if (!user.companyId) {
      return NextResponse.json(
        { success: false, error: 'User is not associated with a company' },
        { status: 400 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        emailDomain: true,
        hourlyRate: true,
        googleReviewUrl: true,
        yelpReviewUrl: true,
        twilioAccountSid: true,
        twilioPhoneNumber: true,
        resendApiKey: true,
        stripeSecretKey: true,
        stripePublishableKey: true,
        stripeWebhookSecret: true,
        enableCustomerReminders: true,
        enableCleanerReminders: true,
        customerReminderHours: true,
        cleanerReminderHours: true,
        enableMorningOfReminder: true,
        morningOfReminderTime: true,
        onlineBookingEnabled: true,
        minimumLeadTimeHours: true,
        maxDaysAhead: true,
        requireApproval: true,
        businessType: true,
        enabledFeatures: true,
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
  } catch (error: unknown) {
    console.error('Get company settings error:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch company settings';
    return NextResponse.json(
      { success: false, error: errorMessage },
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

    // Ensure user has a valid companyId
    if (!user.companyId) {
      return NextResponse.json(
        { success: false, error: 'User is not associated with a company' },
        { status: 400 }
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
    if (validatedData.hourlyRate !== undefined) {
      updateData.hourlyRate = validatedData.hourlyRate;
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
    if (validatedData.enableCustomerReminders !== undefined) {
      updateData.enableCustomerReminders = validatedData.enableCustomerReminders;
    }
    if (validatedData.enableCleanerReminders !== undefined) {
      updateData.enableCleanerReminders = validatedData.enableCleanerReminders;
    }
    if (validatedData.customerReminderHours !== undefined) {
      updateData.customerReminderHours = validatedData.customerReminderHours;
    }
    if (validatedData.cleanerReminderHours !== undefined) {
      updateData.cleanerReminderHours = validatedData.cleanerReminderHours;
    }
    if (validatedData.enableMorningOfReminder !== undefined) {
      updateData.enableMorningOfReminder = validatedData.enableMorningOfReminder;
    }
    if (validatedData.morningOfReminderTime !== undefined) {
      updateData.morningOfReminderTime = validatedData.morningOfReminderTime;
    }

    // Online Booking settings
    if (validatedData.onlineBookingEnabled !== undefined) {
      updateData.onlineBookingEnabled = validatedData.onlineBookingEnabled;
    }
    if (validatedData.minimumLeadTimeHours !== undefined) {
      updateData.minimumLeadTimeHours = validatedData.minimumLeadTimeHours;
    }
    if (validatedData.maxDaysAhead !== undefined) {
      updateData.maxDaysAhead = validatedData.maxDaysAhead;
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
        hourlyRate: true,
        googleReviewUrl: true,
        yelpReviewUrl: true,
        twilioAccountSid: true,
        twilioPhoneNumber: true,
        resendApiKey: true,
        stripeSecretKey: true,
        stripePublishableKey: true,
        stripeWebhookSecret: true,
        enableCustomerReminders: true,
        enableCleanerReminders: true,
        customerReminderHours: true,
        cleanerReminderHours: true,
        enableMorningOfReminder: true,
        morningOfReminderTime: true,
        onlineBookingEnabled: true,
        minimumLeadTimeHours: true,
        maxDaysAhead: true,
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
  } catch (error: unknown) {
    // Log detailed error information
    console.error('Update company settings error:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; message?: string };
      if (prismaError.code === 'P2002') {
        return NextResponse.json(
          { success: false, error: 'A company with this name already exists' },
          { status: 400 }
        );
      }
      if (prismaError.code === 'P2025') {
        return NextResponse.json(
          { success: false, error: 'Company not found' },
          { status: 404 }
        );
      }
    }

    // Return the actual error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Failed to update company settings';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
