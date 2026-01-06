import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface ActivityItem {
  id: string;
  type: 'action' | 'activity';
  category: string;
  title: string;
  description: string;
  timestamp: Date;
  priority: 'high' | 'medium' | 'low';
  metadata?: any;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = session.user as any;

    // Only OWNER and ADMIN can view feed
    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const activities: ActivityItem[] = [];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Fetch bookings for the company
    const bookings = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        scheduledDate: {
          gte: oneDayAgo,
        },
      },
      include: {
        client: true,
        address: true,
        assignee: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    // Generate activity items
    bookings.forEach((booking) => {
      const scheduledDate = new Date(booking.scheduledDate);
      const timeUntilStart = scheduledDate.getTime() - now.getTime();
      const hoursUntilStart = timeUntilStart / (1000 * 60 * 60);

      // ACTION: Cleaning starting soon (within 2 hours)
      if (
        hoursUntilStart > 0 &&
        hoursUntilStart <= 2 &&
        booking.status === 'SCHEDULED'
      ) {
        const hoursText =
          hoursUntilStart < 1
            ? `${Math.round(hoursUntilStart * 60)} minutes`
            : `${Math.round(hoursUntilStart)} hour${Math.round(hoursUntilStart) !== 1 ? 's' : ''}`;

        activities.push({
          id: `cleaning-starting-${booking.id}`,
          type: 'action',
          category: 'cleaning_starting',
          title: `Cleaning starts in ${hoursText}`,
          description: `${booking.client.name} at ${booking.address.street}, ${booking.address.city}`,
          timestamp: scheduledDate,
          priority: hoursUntilStart < 1 ? 'high' : 'medium',
          metadata: {
            clientName: booking.client.name,
            cleanerName: booking.assignee?.user.name || 'Unassigned',
            jobId: booking.id,
          },
        });
      }

      // ACTION: Send reminder for tomorrow's cleanings
      if (
        scheduledDate >= now &&
        scheduledDate <= tomorrow &&
        booking.status === 'SCHEDULED' &&
        booking.assignee
      ) {
        activities.push({
          id: `reminder-${booking.id}`,
          type: 'action',
          category: 'reminder_needed',
          title: 'Send reminder to cleaner',
          description: `Remind ${booking.assignee.user.name || booking.assignee.user.email} about tomorrow's cleaning at ${booking.client.name}`,
          timestamp: new Date(scheduledDate.getTime() - 24 * 60 * 60 * 1000),
          priority: 'medium',
          metadata: {
            clientName: booking.client.name,
            cleanerName:
              booking.assignee.user.name ||
              booking.assignee.user.email,
            jobId: booking.id,
          },
        });
      }

      // ACTIVITY: Cleaner is "On My Way"
      if (
        booking.onMyWaySentAt &&
        booking.onMyWaySentAt >= oneDayAgo &&
        booking.assignee
      ) {
        activities.push({
          id: `on-my-way-${booking.id}`,
          type: 'activity',
          category: 'on_my_way',
          title: 'Cleaner on the way',
          description: `${booking.assignee.user.name || 'Cleaner'} is on the way to ${booking.client.name}`,
          timestamp: booking.onMyWaySentAt,
          priority: 'medium',
          metadata: {
            clientName: booking.client.name,
            cleanerName: booking.assignee.user.name || booking.assignee.user.email,
            jobId: booking.id,
          },
        });
      }

      // ACTIVITY: Cleaner clocked in
      if (
        booking.clockedInAt &&
        booking.clockedInAt >= oneDayAgo &&
        booking.assignee
      ) {
        activities.push({
          id: `clocked-in-${booking.id}`,
          type: 'activity',
          category: 'clocked_in',
          title: 'Cleaner started',
          description: `${booking.assignee.user.name || 'Cleaner'} started cleaning at ${booking.client.name}`,
          timestamp: booking.clockedInAt,
          priority: 'medium',
          metadata: {
            clientName: booking.client.name,
            cleanerName: booking.assignee.user.name || booking.assignee.user.email,
            jobId: booking.id,
          },
        });
      }

      // ACTIVITY: Cleaner clocked out
      if (
        booking.clockedOutAt &&
        booking.clockedOutAt >= oneDayAgo &&
        booking.assignee
      ) {
        activities.push({
          id: `clocked-out-${booking.id}`,
          type: 'activity',
          category: 'clocked_out',
          title: 'Cleaner finished',
          description: `${booking.assignee.user.name || 'Cleaner'} finished cleaning at ${booking.client.name}`,
          timestamp: booking.clockedOutAt,
          priority: 'low',
          metadata: {
            clientName: booking.client.name,
            cleanerName: booking.assignee.user.name || booking.assignee.user.email,
            jobId: booking.id,
          },
        });
      }

      // ACTIVITY: Recently completed cleaning
      if (
        booking.status === 'COMPLETED' &&
        booking.updatedAt &&
        booking.updatedAt >= oneDayAgo
      ) {
        activities.push({
          id: `completed-${booking.id}`,
          type: 'activity',
          category: 'cleaning_completed',
          title: 'Cleaning completed',
          description: `${booking.assignee?.user.name || 'Cleaner'} finished cleaning at ${booking.client.name}`,
          timestamp: booking.updatedAt,
          priority: 'low',
          metadata: {
            clientName: booking.client.name,
            cleanerName:
              booking.assignee?.user.name ||
              booking.assignee?.user.email ||
              'Unassigned',
            jobId: booking.id,
          },
        });
      }

      // ACTIVITY: Payment charged
      if (
        booking.isPaid &&
        booking.updatedAt &&
        booking.updatedAt >= oneDayAgo &&
        booking.status === 'COMPLETED'
      ) {
        activities.push({
          id: `payment-${booking.id}`,
          type: 'activity',
          category: 'payment_charged',
          title: 'Payment processed',
          description: `${booking.client.name} charged $${booking.price.toFixed(2)} for cleaning on ${scheduledDate.toLocaleDateString()}`,
          timestamp: booking.updatedAt,
          priority: 'low',
          metadata: {
            clientName: booking.client.name,
            amount: booking.price,
            jobId: booking.id,
          },
        });
      }

      // ACTIVITY: New booking created
      if (booking.createdAt && booking.createdAt >= oneDayAgo) {
        activities.push({
          id: `booking-created-${booking.id}`,
          type: 'activity',
          category: 'booking_created',
          title: 'Booking scheduled',
          description: `Scheduled ${booking.client.name} for ${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}${booking.assignee ? ` (Assigned to ${booking.assignee.user.name || 'cleaner'})` : ''}`,
          timestamp: booking.createdAt,
          priority: 'low',
          metadata: {
            clientName: booking.client.name,
            cleanerName: booking.assignee?.user.name || 'Unassigned',
            amount: booking.price,
            jobId: booking.id,
          },
        });
      }
    });

    // Fetch recently created clients
    const clients = await prisma.client.findMany({
      where: {
        companyId: user.companyId,
        createdAt: {
          gte: oneDayAgo,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    clients.forEach((client) => {
      if (client.createdAt && client.createdAt >= oneDayAgo) {
        activities.push({
          id: `client-created-${client.id}`,
          type: 'activity',
          category: 'client_created',
          title: 'New client added',
          description: `${client.user.name || client.user.email || 'Staff'} added ${client.name} as a new client`,
          timestamp: client.createdAt,
          priority: 'low',
          metadata: {
            clientName: client.name,
            createdBy: client.user.name || client.user.email,
            clientId: client.id,
          },
        });
      }
    });

    // Fetch recent team member additions
    const teamMembers = await prisma.teamMember.findMany({
      where: {
        companyId: user.companyId,
        createdAt: {
          gte: oneDayAgo,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    teamMembers.forEach((member) => {
      if (member.createdAt && member.createdAt >= oneDayAgo) {
        activities.push({
          id: `team-member-added-${member.id}`,
          type: 'activity',
          category: 'team_member_added',
          title: 'New team member',
          description: `${member.user.name || member.user.email} joined as ${member.user.role}`,
          timestamp: member.createdAt,
          priority: 'low',
          metadata: {
            memberName: member.user.name || member.user.email,
            role: member.user.role,
            memberId: member.id,
          },
        });
      }
    });

    // Fetch recent estimates
    const estimates = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        estimateToken: {
          not: null,
        },
        createdAt: {
          gte: oneDayAgo,
        },
      },
      include: {
        client: true,
      },
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
    });

    estimates.forEach((estimate) => {
      if (estimate.createdAt && estimate.createdAt >= oneDayAgo) {
        activities.push({
          id: `estimate-sent-${estimate.id}`,
          type: 'activity',
          category: 'estimate_sent',
          title: 'Estimate sent',
          description: `Sent $${estimate.price.toFixed(2)} estimate to ${estimate.client.name}`,
          timestamp: estimate.createdAt,
          priority: 'low',
          metadata: {
            clientName: estimate.client.name,
            amount: estimate.price,
            estimateId: estimate.id,
          },
        });
      }
    });

    // Sort activities by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Limit to most recent 50 activities
    const limitedActivities = activities.slice(0, 50);

    return NextResponse.json({
      success: true,
      data: limitedActivities,
    });
  } catch (error) {
    console.error('Feed error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feed' },
      { status: 500 }
    );
  }
}
