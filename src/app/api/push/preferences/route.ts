import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const preferencesSchema = z.object({
  pushEnabled: z.boolean().optional(),
  pushJobAssignments: z.boolean().optional(),
  pushJobReminders: z.boolean().optional(),
  pushPaymentReceived: z.boolean().optional(),
  pushReviewReceived: z.boolean().optional(),
  pushChatMessages: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  emailJobAssignments: z.boolean().optional(),
  emailJobReminders: z.boolean().optional(),
  emailDailyDigest: z.boolean().optional(),
  emailWeeklyReport: z.boolean().optional(),
  emailMarketingOptIn: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  smsJobReminders: z.boolean().optional(),
  smsUrgentOnly: z.boolean().optional(),
});

// GET: Get notification preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId: session.user.id },
    });

    // Return default preferences if none exist
    if (!preferences) {
      preferences = {
        id: '',
        userId: session.user.id,
        pushEnabled: true,
        pushJobAssignments: true,
        pushJobReminders: true,
        pushPaymentReceived: true,
        pushReviewReceived: true,
        pushChatMessages: true,
        emailEnabled: true,
        emailJobAssignments: true,
        emailJobReminders: true,
        emailDailyDigest: false,
        emailWeeklyReport: true,
        emailMarketingOptIn: true,
        smsEnabled: true,
        smsJobReminders: true,
        smsUrgentOnly: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Update notification preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = preferencesSchema.parse(body);

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: session.user.id },
      update: validatedData,
      create: {
        userId: session.user.id,
        ...validatedData,
      },
    });

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Update notification preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
