import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const subscriptionSchema = z.object({
  endpoint: z.string().url('Valid endpoint URL required'),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  deviceType: z.string().optional(),
  deviceName: z.string().optional(),
  platform: z.string().optional(),
});

// POST: Subscribe to push notifications
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = subscriptionSchema.parse(body);

    // Get user agent for device info
    const userAgent = request.headers.get('user-agent') || '';

    // Check if subscription already exists
    const existingSubscription = await prisma.pushSubscription.findFirst({
      where: {
        userId: session.user.id,
        endpoint: validatedData.endpoint,
      },
    });

    if (existingSubscription) {
      // Update existing subscription
      const subscription = await prisma.pushSubscription.update({
        where: { id: existingSubscription.id },
        data: {
          p256dh: validatedData.keys.p256dh,
          auth: validatedData.keys.auth,
          deviceType: validatedData.deviceType,
          deviceName: validatedData.deviceName,
          platform: validatedData.platform,
          userAgent,
          isActive: true,
          lastUsed: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: { id: subscription.id },
        message: 'Subscription updated',
      });
    }

    // Create new subscription
    const subscription = await prisma.pushSubscription.create({
      data: {
        userId: session.user.id,
        endpoint: validatedData.endpoint,
        p256dh: validatedData.keys.p256dh,
        auth: validatedData.keys.auth,
        deviceType: validatedData.deviceType,
        deviceName: validatedData.deviceName,
        platform: validatedData.platform,
        userAgent,
        isActive: true,
      },
    });

    // Create default notification preferences if not exists
    await prisma.notificationPreference.upsert({
      where: { userId: session.user.id },
      update: {},
      create: {
        userId: session.user.id,
        pushEnabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { id: subscription.id },
      message: 'Subscribed to push notifications',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Push subscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      // Deactivate all subscriptions for user
      await prisma.pushSubscription.updateMany({
        where: { userId: session.user.id },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        message: 'Unsubscribed from all push notifications',
      });
    }

    // Deactivate specific subscription
    await prisma.pushSubscription.updateMany({
      where: {
        userId: session.user.id,
        endpoint,
      },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Unsubscribed from push notifications',
    });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: Get push subscription status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      select: {
        id: true,
        deviceType: true,
        deviceName: true,
        platform: true,
        createdAt: true,
        lastUsed: true,
      },
    });

    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      success: true,
      data: {
        subscriptions,
        preferences: preferences || {
          pushEnabled: true,
          pushJobAssignments: true,
          pushJobReminders: true,
          pushPaymentReceived: true,
          pushReviewReceived: true,
          pushChatMessages: true,
        },
      },
    });
  } catch (error) {
    console.error('Get push status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
