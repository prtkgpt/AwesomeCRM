import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in miles
}

// Estimate drive time based on distance (assuming 25 mph average in urban areas)
function estimateDriveTime(distanceMiles: number): number {
  const averageSpeed = 25; // mph
  return Math.round((distanceMiles / averageSpeed) * 60); // minutes
}

// GET /api/cleaner/today - Get today's jobs with route optimization
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'CLEANER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: { userId: user.id },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member profile not found' }, { status: 404 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Get today's jobs with full address info including coordinates
    const todayJobsRaw = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        scheduledDate: {
          gte: todayStart,
          lte: todayEnd,
        },
        OR: [
          { assignedTo: teamMember.id },
          { assignedTo: null },
        ],
      },
      include: {
        client: {
          select: {
            name: true,
            phone: true,
            preferences: true,
          },
        },
        address: {
          select: {
            id: true,
            street: true,
            city: true,
            state: true,
            zip: true,
            lat: true,
            lng: true,
            gateCode: true,
            parkingInfo: true,
            petInfo: true,
            preferences: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    // Calculate wages and add route data
    const jobs = todayJobsRaw.map((job, index) => {
      const durationHours = job.duration / 60;
      const wage = teamMember.hourlyRate ? teamMember.hourlyRate * durationHours : 0;

      // Calculate distance and drive time from previous job
      let distanceFromPrevious: number | null = null;
      let driveTimeFromPrevious: number | null = null;

      if (index > 0) {
        const prevJob = todayJobsRaw[index - 1];
        if (prevJob.address?.lat && prevJob.address?.lng &&
            job.address?.lat && job.address?.lng) {
          distanceFromPrevious = calculateDistance(
            prevJob.address.lat,
            prevJob.address.lng,
            job.address.lat,
            job.address.lng
          );
          driveTimeFromPrevious = estimateDriveTime(distanceFromPrevious);
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { price, ...jobWithoutPrice } = job;
      return {
        ...jobWithoutPrice,
        wage: parseFloat(wage.toFixed(2)),
        hourlyRate: teamMember.hourlyRate || 0,
        stopNumber: index + 1,
        distanceFromPrevious: distanceFromPrevious ? parseFloat(distanceFromPrevious.toFixed(1)) : null,
        driveTimeFromPrevious,
      };
    });

    // Calculate total route stats
    let totalDistance = 0;
    let totalDriveTime = 0;
    let totalJobTime = 0;

    jobs.forEach((job) => {
      if (job.distanceFromPrevious) {
        totalDistance += job.distanceFromPrevious;
      }
      if (job.driveTimeFromPrevious) {
        totalDriveTime += job.driveTimeFromPrevious;
      }
      totalJobTime += job.duration;
    });

    // Get first and last job coordinates for map bounds
    const firstJob = jobs[0];
    const lastJob = jobs[jobs.length - 1];
    const mapBounds = {
      first: firstJob?.address ? { lat: firstJob.address.lat, lng: firstJob.address.lng } : null,
      last: lastJob?.address ? { lat: lastJob.address.lat, lng: lastJob.address.lng } : null,
    };

    return NextResponse.json({
      success: true,
      jobs,
      routeStats: {
        totalJobs: jobs.length,
        totalDistance: parseFloat(totalDistance.toFixed(1)),
        totalDriveTime,
        totalJobTime,
        estimatedFinishTime: jobs.length > 0
          ? new Date(new Date(jobs[0].scheduledDate).getTime() + (totalJobTime + totalDriveTime) * 60000).toISOString()
          : null,
      },
      mapBounds,
      date: todayStart.toISOString(),
    });
  } catch (error) {
    console.error('GET /api/cleaner/today error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch today\'s route' },
      { status: 500 }
    );
  }
}
