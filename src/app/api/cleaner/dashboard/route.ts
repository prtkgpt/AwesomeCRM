import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, format, differenceInMinutes } from 'date-fns';

// GET: Get cleaner dashboard data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true, name: true },
      include: { teamMember: true },
    });

    if (!user || user.role !== 'CLEANER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!user.teamMember) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
    }

    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);
    const thirtyDaysAgo = addDays(today, -30);

    // Get today's jobs
    const todaysJobs = await prisma.booking.findMany({
      where: {
        assignedTo: user.teamMember.id,
        scheduledDate: { gte: todayStart, lte: todayEnd },
        status: { not: 'CANCELLED' },
      },
      include: {
        client: {
          select: {
            name: true,
            phone: true,
            email: true,
            preferences: true,
          },
        },
        address: {
          select: {
            street: true,
            city: true,
            state: true,
            zip: true,
            parkingInfo: true,
            gateCode: true,
            petInfo: true,
            preferences: true,
            lat: true,
            lng: true,
          },
        },
        checklist: {
          select: { totalTasks: true, completedTasks: true },
        },
        photos: {
          select: { id: true, type: true, url: true },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // Get upcoming jobs (next 7 days excluding today)
    const upcomingJobs = await prisma.booking.findMany({
      where: {
        assignedTo: user.teamMember.id,
        scheduledDate: { gt: todayEnd, lte: weekEnd },
        status: 'SCHEDULED',
      },
      include: {
        client: { select: { name: true } },
        address: { select: { street: true, city: true } },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 10,
    });

    // Get performance stats for the last 30 days
    const recentBookings = await prisma.booking.findMany({
      where: {
        assignedTo: user.teamMember.id,
        status: { in: ['COMPLETED', 'CLEANER_COMPLETED'] },
        scheduledDate: { gte: thirtyDaysAgo },
      },
      select: {
        price: true,
        tipAmount: true,
        customerRating: true,
        duration: true,
        clockedInAt: true,
        clockedOutAt: true,
      },
    });

    // Calculate stats
    const totalRevenue = recentBookings.reduce((sum, b) => sum + b.price, 0);
    const totalTips = recentBookings.reduce((sum, b) => sum + (b.tipAmount || 0), 0);
    const ratings = recentBookings.filter((b) => b.customerRating !== null).map((b) => b.customerRating!);
    const averageRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : null;

    // Calculate hours worked
    let totalHoursWorked = 0;
    recentBookings.forEach((b) => {
      if (b.clockedInAt && b.clockedOutAt) {
        totalHoursWorked += differenceInMinutes(new Date(b.clockedOutAt), new Date(b.clockedInAt)) / 60;
      } else {
        totalHoursWorked += b.duration / 60;
      }
    });

    // Get pending time off requests
    const pendingTimeOff = await prisma.cleanerTimeOff.findMany({
      where: {
        teamMemberId: user.teamMember.id,
        startDate: { gte: today },
      },
      orderBy: { startDate: 'asc' },
      take: 3,
    });

    // Calculate active job (if any)
    const activeJob = todaysJobs.find((j) => j.clockedInAt && !j.clockedOutAt);

    // Weekly summary
    const thisWeekBookings = await prisma.booking.count({
      where: {
        assignedTo: user.teamMember.id,
        scheduledDate: { gte: weekStart, lte: weekEnd },
        status: { not: 'CANCELLED' },
      },
    });

    const thisWeekCompleted = await prisma.booking.count({
      where: {
        assignedTo: user.teamMember.id,
        scheduledDate: { gte: weekStart, lte: weekEnd },
        status: { in: ['COMPLETED', 'CLEANER_COMPLETED'] },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        cleaner: {
          id: user.teamMember.id,
          name: user.name || 'Cleaner',
          photo: user.teamMember.photo,
          specialties: user.teamMember.specialties,
        },
        today: {
          date: format(today, 'EEEE, MMMM d, yyyy'),
          totalJobs: todaysJobs.length,
          completedJobs: todaysJobs.filter((j) =>
            ['COMPLETED', 'CLEANER_COMPLETED'].includes(j.status)
          ).length,
          remainingJobs: todaysJobs.filter((j) => j.status === 'SCHEDULED').length,
          activeJob: activeJob
            ? {
                id: activeJob.id,
                clientName: activeJob.client.name,
                address: `${activeJob.address.street}, ${activeJob.address.city}`,
                clockedInAt: activeJob.clockedInAt,
                duration: activeJob.duration,
              }
            : null,
          jobs: todaysJobs.map((j) => ({
            id: j.id,
            scheduledDate: j.scheduledDate,
            duration: j.duration,
            serviceType: j.serviceType,
            status: j.status,
            price: j.price,
            client: {
              name: j.client.name,
              phone: j.client.phone,
            },
            address: {
              full: `${j.address.street}, ${j.address.city}, ${j.address.state} ${j.address.zip}`,
              street: j.address.street,
              city: j.address.city,
              lat: j.address.lat,
              lng: j.address.lng,
              parkingInfo: j.address.parkingInfo,
              gateCode: j.address.gateCode,
              petInfo: j.address.petInfo,
              preferences: j.address.preferences,
            },
            customerPreferences: j.client.preferences,
            notes: j.notes,
            clockedInAt: j.clockedInAt,
            clockedOutAt: j.clockedOutAt,
            onMyWaySentAt: j.onMyWaySentAt,
            checklist: j.checklist,
            photoCount: j.photos.length,
          })),
        },
        upcoming: {
          count: upcomingJobs.length,
          jobs: upcomingJobs.map((j) => ({
            id: j.id,
            scheduledDate: j.scheduledDate,
            clientName: j.client.name,
            address: `${j.address.street}, ${j.address.city}`,
          })),
        },
        weekSummary: {
          totalJobs: thisWeekBookings,
          completedJobs: thisWeekCompleted,
          remainingJobs: thisWeekBookings - thisWeekCompleted,
        },
        performance: {
          last30Days: {
            jobsCompleted: recentBookings.length,
            totalRevenue,
            totalTips,
            averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null,
            totalRatings: ratings.length,
            hoursWorked: Math.round(totalHoursWorked * 10) / 10,
          },
        },
        timeOff: pendingTimeOff.map((t) => ({
          id: t.id,
          startDate: t.startDate,
          endDate: t.endDate,
          reason: t.reason,
          isApproved: t.isApproved,
        })),
      },
    });
  } catch (error) {
    console.error('Cleaner dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
