// ============================================
// CleanDayCRM - Notifications API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createNotificationSchema = z.object({
  userId: z.string().cuid().optional(), // If null, send to multiple users
  userIds: z.array(z.string().cuid()).optional(),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(1000),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'BOOKING', 'PAYMENT', 'REVIEW', 'SYSTEM']),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  actionUrl: z.string().optional(),
  channels: z.array(z.enum(['IN_APP', 'EMAIL', 'SMS', 'PUSH'])).default(['IN_APP']),
});

// GET /api/notifications - Get user's notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const type = searchParams.get('type');

    const where: any = { userId: session.user.id };
    if (unreadOnly) where.readAt = null;
    if (type) where.type = type;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: session.user.id, readAt: null },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create notification (admin only)
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

    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = createNotificationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { userId, userIds, channels, ...notificationData } = validation.data;

    const targetUserIds = userId ? [userId] : userIds || [];

    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one user ID is required' },
        { status: 400 }
      );
    }

    // Verify users belong to same company
    const validUsers = await prisma.user.findMany({
      where: {
        id: { in: targetUserIds },
        companyId: user.companyId,
      },
      select: { id: true, email: true, phone: true },
    });

    if (validUsers.length === 0) {
      return NextResponse.json({ error: 'No valid users found' }, { status: 404 });
    }

    // Create notifications
    const notifications = await prisma.notification.createMany({
      data: validUsers.map(u => ({
        userId: u.id,
        ...notificationData,
        channels,
      })),
    });

    // Send via channels (TODO: Implement email/SMS/push)
    if (channels.includes('EMAIL')) {
      // TODO: Send email notifications
      console.log('Would send email to', validUsers.map(u => u.email));
    }
    if (channels.includes('SMS')) {
      // TODO: Send SMS notifications
      console.log('Would send SMS to', validUsers.map(u => u.phone));
    }

    return NextResponse.json({
      success: true,
      count: notifications.count,
      message: `Notification sent to ${notifications.count} user(s)`,
    });
  } catch (error) {
    console.error('POST /api/notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAllRead } = body;

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, readAt: null },
        data: { readAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      });
    }

    if (notificationIds && Array.isArray(notificationIds)) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: session.user.id,
        },
        data: { readAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: `${notificationIds.length} notification(s) marked as read`,
      });
    }

    return NextResponse.json(
      { error: 'Either notificationIds or markAllRead is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('PATCH /api/notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
