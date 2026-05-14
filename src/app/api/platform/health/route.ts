import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/platform/health - System health dashboard data
export async function GET(req: NextRequest) {
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
      select: { isPlatformAdmin: true },
    });

    if (!user?.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const hours = Math.max(1, parseInt(searchParams.get('hours') || '24'));
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const allEvents = await prisma.systemEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });

    // Summary
    const totalEvents = allEvents.length;
    const errors = allEvents.filter((e) => e.status === 'error').length;
    const warnings = allEvents.filter((e) => e.status === 'warning').length;
    const successes = allEvents.filter((e) => e.status === 'success').length;

    const summary = { totalEvents, errors, warnings, successes };

    // By source
    const sourceMap = new Map<
      string,
      { source: string; total: number; errors: number; successes: number; lastEvent: Date }
    >();

    for (const event of allEvents) {
      const existing = sourceMap.get(event.source);
      if (!existing) {
        sourceMap.set(event.source, {
          source: event.source,
          total: 1,
          errors: event.status === 'error' ? 1 : 0,
          successes: event.status === 'success' ? 1 : 0,
          lastEvent: event.createdAt,
        });
      } else {
        existing.total += 1;
        if (event.status === 'error') existing.errors += 1;
        if (event.status === 'success') existing.successes += 1;
        if (event.createdAt > existing.lastEvent) {
          existing.lastEvent = event.createdAt;
        }
      }
    }

    const bySource = Array.from(sourceMap.values());

    // Recent errors
    const recentErrors = allEvents
      .filter((e) => e.status === 'error')
      .slice(0, 20);

    // Cron status: for each source starting with "cron", get last run time and status
    const cronSources = new Map<
      string,
      { source: string; lastRunAt: Date; lastStatus: string }
    >();

    for (const event of allEvents) {
      if (event.source.startsWith('cron')) {
        if (!cronSources.has(event.source)) {
          cronSources.set(event.source, {
            source: event.source,
            lastRunAt: event.createdAt,
            lastStatus: event.status,
          });
        }
      }
    }

    const cronStatus = Array.from(cronSources.values());

    return NextResponse.json({
      success: true,
      data: {
        summary,
        bySource,
        recentErrors,
        cronStatus,
      },
    });
  } catch (error) {
    console.error('Platform: health error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch system health' },
      { status: 500 }
    );
  }
}
