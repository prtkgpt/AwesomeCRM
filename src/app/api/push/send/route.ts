import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import webpush from 'web-push';

const sendNotificationSchema = z.object({
  userId: z.string().optional(),
  userIds: z.array(z.string()).optional(),
  role: z.enum(['OWNER', 'ADMIN', 'CLEANER', 'CUSTOMER']).optional(),
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
  icon: z.string().optional(),
  tag: z.string().optional(),
  data: z.record(z.any()).optional(),
  actions: z.array(z.object({
    action: z.string(),
    title: z.string(),
  })).optional(),
  requireInteraction: z.boolean().optional(),
});

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

// POST: Send push notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    // Only admins and owners can send push notifications
    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { error: 'Push notifications not configured. Set VAPID keys.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const validatedData = sendNotificationSchema.parse(body);

    // Determine target users
    let targetUserIds: string[] = [];

    if (validatedData.userId) {
      targetUserIds = [validatedData.userId];
    } else if (validatedData.userIds) {
      targetUserIds = validatedData.userIds;
    } else if (validatedData.role) {
      // Get all users with the specified role in the company
      const users = await prisma.user.findMany({
        where: {
          companyId: user.companyId,
          role: validatedData.role,
        },
        select: { id: true },
      });
      targetUserIds = users.map((u) => u.id);
    } else {
      return NextResponse.json(
        { error: 'Must specify userId, userIds, or role' },
        { status: 400 }
      );
    }

    // Get active push subscriptions for target users
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: { in: targetUserIds },
        isActive: true,
      },
      include: {
        user: {
          include: {
            notificationPreference: true,
          },
        },
      },
    });

    // Filter by notification preferences
    const activeSubscriptions = subscriptions.filter((sub) => {
      const prefs = sub.user.notificationPreference;
      if (!prefs?.pushEnabled) return false;

      // Check specific notification type preferences
      const notificationType = validatedData.data?.type;
      if (notificationType === 'JOB_ASSIGNED' && !prefs.pushJobAssignments) return false;
      if (notificationType === 'JOB_REMINDER' && !prefs.pushJobReminders) return false;
      if (notificationType === 'PAYMENT_RECEIVED' && !prefs.pushPaymentReceived) return false;
      if (notificationType === 'REVIEW_RECEIVED' && !prefs.pushReviewReceived) return false;

      return true;
    });

    // Prepare notification payload
    const payload = JSON.stringify({
      title: validatedData.title,
      body: validatedData.body,
      icon: validatedData.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: validatedData.tag || 'general',
      data: validatedData.data || {},
      actions: validatedData.actions || [],
      requireInteraction: validatedData.requireInteraction || false,
    });

    // Send notifications
    const results = await Promise.allSettled(
      activeSubscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            payload
          );

          // Update last used timestamp
          await prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: { lastUsed: new Date() },
          });

          return { subscriptionId: subscription.id, success: true };
        } catch (error: any) {
          // Handle expired/invalid subscriptions
          if (error.statusCode === 404 || error.statusCode === 410) {
            await prisma.pushSubscription.update({
              where: { id: subscription.id },
              data: { isActive: false },
            });
          }
          return {
            subscriptionId: subscription.id,
            success: false,
            error: error.message,
          };
        }
      })
    );

    const successful = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.filter(
      (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        targetUsers: targetUserIds.length,
        activeSubscriptions: activeSubscriptions.length,
        sent: successful,
        failed,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Send push notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
