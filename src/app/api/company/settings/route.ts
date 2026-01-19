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
  morningReminderTime: z.string().optional(),
  // Online Booking settings
  onlineBookingEnabled: z.boolean().optional(),
  minimumLeadTime: z.number().min(0).max(168).optional(),
  maximumLeadTime: z.number().min(1).max(365).optional(),
  requireApproval: z.boolean().optional(),
});

// Helper to safely mask sensitive data
const maskSensitive = (value: string | null | undefined): string | null => {
  if (!value) return null;
  return '••••••••' + value.slice(-4);
};

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

    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Only select fields that definitely exist and are needed
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        emailDomain: true,
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
        timezone: true,
        createdAt: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    // Return data with defaults for any null values and masked sensitive fields
    return NextResponse.json({
      success: true,
      data: {
        id: company.id,
        name: company.name || '',
        slug: company.slug || '',
        emailDomain: company.emailDomain || '',
        googleReviewUrl: company.googleReviewUrl || '',
        yelpReviewUrl: company.yelpReviewUrl || '',
        twilioAccountSid: maskSensitive(company.twilioAccountSid),
        twilioPhoneNumber: company.twilioPhoneNumber || '',
        resendApiKey: maskSensitive(company.resendApiKey),
        stripeSecretKey: maskSensitive(company.stripeSecretKey),
        stripePublishableKey: company.stripePublishableKey || '',
        stripeWebhookSecret: maskSensitive(company.stripeWebhookSecret),
        customerReminderEnabled: company.customerReminderEnabled ?? true,
        cleanerReminderEnabled: company.cleanerReminderEnabled ?? true,
        customerReminderHours: company.customerReminderHours ?? 24,
        cleanerReminderHours: company.cleanerReminderHours ?? 24,
        morningReminderEnabled: company.morningReminderEnabled ?? true,
        morningReminderTime: company.morningReminderTime || '08:00',
        onlineBookingEnabled: company.onlineBookingEnabled ?? true,
        minimumLeadTime: company.minimumLeadTime ?? 2,
        maximumLeadTime: company.maximumLeadTime ?? 60,
        requireApproval: company.requireApproval ?? false,
        timezone: company.timezone || 'America/Los_Angeles',
        createdAt: company.createdAt,
      },
    });
  } catch (error) {
    console.error('Get company settings error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to fetch company settings: ${errorMessage}` },
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

    if (user.role !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: 'Only company owner can update settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateCompanySettingsSchema.parse(body);

    // Check if company name is being changed and if it's already in use
    if (validatedData.name && validatedData.name.trim()) {
      const existingCompany = await prisma.company.findFirst({
        where: {
          name: validatedData.name,
          NOT: { id: user.companyId },
        },
      });

      if (existingCompany) {
        return NextResponse.json(
          { success: false, error: 'Company name is already in use' },
          { status: 400 }
        );
      }
    }

    // Build update data - only include fields that have real values
    const updateData: Record<string, any> = {};

    // Text fields - only update if non-empty
    if (validatedData.name && validatedData.name.trim()) {
      updateData.name = validatedData.name.trim();
    }
    if (validatedData.emailDomain && validatedData.emailDomain.trim()) {
      updateData.emailDomain = validatedData.emailDomain.trim();
    }
    if (validatedData.googleReviewUrl && validatedData.googleReviewUrl.trim()) {
      updateData.googleReviewUrl = validatedData.googleReviewUrl.trim();
    }
    if (validatedData.yelpReviewUrl && validatedData.yelpReviewUrl.trim()) {
      updateData.yelpReviewUrl = validatedData.yelpReviewUrl.trim();
    }
    if (validatedData.twilioPhoneNumber && validatedData.twilioPhoneNumber.trim()) {
      updateData.twilioPhoneNumber = validatedData.twilioPhoneNumber.trim();
    }
    if (validatedData.timezone && validatedData.timezone.trim()) {
      updateData.timezone = validatedData.timezone.trim();
    }
    if (validatedData.morningReminderTime && validatedData.morningReminderTime.trim()) {
      updateData.morningReminderTime = validatedData.morningReminderTime.trim();
    }

    // Sensitive fields - only update if non-empty AND not masked
    const isMasked = (val: string) => val.startsWith('••');

    if (validatedData.twilioAccountSid && validatedData.twilioAccountSid.trim() && !isMasked(validatedData.twilioAccountSid)) {
      updateData.twilioAccountSid = validatedData.twilioAccountSid.trim();
    }
    if (validatedData.twilioAuthToken && validatedData.twilioAuthToken.trim() && !isMasked(validatedData.twilioAuthToken)) {
      updateData.twilioAuthToken = validatedData.twilioAuthToken.trim();
    }
    if (validatedData.resendApiKey && validatedData.resendApiKey.trim() && !isMasked(validatedData.resendApiKey)) {
      updateData.resendApiKey = validatedData.resendApiKey.trim();
    }
    if (validatedData.stripeSecretKey && validatedData.stripeSecretKey.trim() && !isMasked(validatedData.stripeSecretKey)) {
      updateData.stripeSecretKey = validatedData.stripeSecretKey.trim();
    }
    if (validatedData.stripePublishableKey && validatedData.stripePublishableKey.trim()) {
      updateData.stripePublishableKey = validatedData.stripePublishableKey.trim();
    }
    if (validatedData.stripeWebhookSecret && validatedData.stripeWebhookSecret.trim() && !isMasked(validatedData.stripeWebhookSecret)) {
      updateData.stripeWebhookSecret = validatedData.stripeWebhookSecret.trim();
    }

    // Boolean fields - always update if provided
    if (validatedData.customerReminderEnabled !== undefined) {
      updateData.customerReminderEnabled = validatedData.customerReminderEnabled;
    }
    if (validatedData.cleanerReminderEnabled !== undefined) {
      updateData.cleanerReminderEnabled = validatedData.cleanerReminderEnabled;
    }
    if (validatedData.morningReminderEnabled !== undefined) {
      updateData.morningReminderEnabled = validatedData.morningReminderEnabled;
    }
    if (validatedData.onlineBookingEnabled !== undefined) {
      updateData.onlineBookingEnabled = validatedData.onlineBookingEnabled;
    }
    if (validatedData.requireApproval !== undefined) {
      updateData.requireApproval = validatedData.requireApproval;
    }

    // Number fields - always update if provided
    if (validatedData.customerReminderHours !== undefined) {
      updateData.customerReminderHours = validatedData.customerReminderHours;
    }
    if (validatedData.cleanerReminderHours !== undefined) {
      updateData.cleanerReminderHours = validatedData.cleanerReminderHours;
    }
    if (validatedData.minimumLeadTime !== undefined) {
      updateData.minimumLeadTime = validatedData.minimumLeadTime;
    }
    if (validatedData.maximumLeadTime !== undefined) {
      updateData.maximumLeadTime = validatedData.maximumLeadTime;
    }

    // Update company
    const updatedCompany = await prisma.company.update({
      where: { id: user.companyId },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        emailDomain: true,
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
        timezone: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedCompany.id,
        name: updatedCompany.name || '',
        slug: updatedCompany.slug || '',
        emailDomain: updatedCompany.emailDomain || '',
        googleReviewUrl: updatedCompany.googleReviewUrl || '',
        yelpReviewUrl: updatedCompany.yelpReviewUrl || '',
        twilioAccountSid: maskSensitive(updatedCompany.twilioAccountSid),
        twilioPhoneNumber: updatedCompany.twilioPhoneNumber || '',
        resendApiKey: maskSensitive(updatedCompany.resendApiKey),
        stripeSecretKey: maskSensitive(updatedCompany.stripeSecretKey),
        stripePublishableKey: updatedCompany.stripePublishableKey || '',
        stripeWebhookSecret: maskSensitive(updatedCompany.stripeWebhookSecret),
        customerReminderEnabled: updatedCompany.customerReminderEnabled ?? true,
        cleanerReminderEnabled: updatedCompany.cleanerReminderEnabled ?? true,
        customerReminderHours: updatedCompany.customerReminderHours ?? 24,
        cleanerReminderHours: updatedCompany.cleanerReminderHours ?? 24,
        morningReminderEnabled: updatedCompany.morningReminderEnabled ?? true,
        morningReminderTime: updatedCompany.morningReminderTime || '08:00',
        onlineBookingEnabled: updatedCompany.onlineBookingEnabled ?? true,
        minimumLeadTime: updatedCompany.minimumLeadTime ?? 2,
        maximumLeadTime: updatedCompany.maximumLeadTime ?? 60,
        requireApproval: updatedCompany.requireApproval ?? false,
        timezone: updatedCompany.timezone || 'America/Los_Angeles',
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

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to update company settings: ${errorMessage}` },
      { status: 500 }
    );
  }
}
