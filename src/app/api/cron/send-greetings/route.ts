import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBirthdayGreeting, sendAnniversaryGreeting } from '@/lib/notifications';

/**
 * Cron job to send birthday and anniversary greetings
 * Runs daily at 9 AM to check for today's birthdays/anniversaries
 *
 * Schedule: 0 9 * * * (daily at 9:00 AM)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🎉 Starting greeting cron job...');

    const today = new Date();
    const todayMonth = today.getMonth() + 1; // getMonth() returns 0-11
    const todayDay = today.getDate();

    // Get current year to prevent sending duplicate greetings in the same year
    const currentYear = today.getFullYear();
    const yearStart = new Date(currentYear, 0, 1); // January 1st of current year

    // Find clients with birthdays today who haven't received a greeting this year
    const clientsWithBirthdays = await prisma.client.findMany({
      where: {
        birthday: {
          not: null,
        },
        enableBirthdayGreetings: true,
        OR: [
          { lastBirthdayGreetingSent: null },
          { lastBirthdayGreetingSent: { lt: yearStart } },
        ],
      },
      include: {
        company: true,
      },
    });

    // Filter clients whose birthday is today (month and day match)
    const birthdaysToday = clientsWithBirthdays.filter((client) => {
      if (!client.birthday) return false;
      const birthdayDate = new Date(client.birthday);
      return (
        birthdayDate.getMonth() + 1 === todayMonth &&
        birthdayDate.getDate() === todayDay
      );
    });

    console.log(`📅 Found ${birthdaysToday.length} birthdays today`);

    // Send birthday greetings
    const birthdayResults = await Promise.allSettled(
      birthdaysToday.map((client) => sendBirthdayGreeting(client.id))
    );

    const birthdaysSuccessful = birthdayResults.filter((r) => r.status === 'fulfilled').length;
    const birthdaysFailed = birthdayResults.filter((r) => r.status === 'rejected').length;

    // Find clients with anniversaries today who haven't received a greeting this year
    const clientsWithAnniversaries = await prisma.client.findMany({
      where: {
        anniversary: {
          not: null,
        },
        enableAnniversaryGreetings: true,
        OR: [
          { lastAnniversaryGreetingSent: null },
          { lastAnniversaryGreetingSent: { lt: yearStart } },
        ],
      },
      include: {
        company: true,
      },
    });

    // Filter clients whose anniversary is today (month and day match)
    const anniversariesToday = clientsWithAnniversaries.filter((client) => {
      if (!client.anniversary) return false;
      const anniversaryDate = new Date(client.anniversary);
      return (
        anniversaryDate.getMonth() + 1 === todayMonth &&
        anniversaryDate.getDate() === todayDay
      );
    });

    console.log(`💙 Found ${anniversariesToday.length} anniversaries today`);

    // Send anniversary greetings
    const anniversaryResults = await Promise.allSettled(
      anniversariesToday.map((client) => sendAnniversaryGreeting(client.id))
    );

    const anniversariesSuccessful = anniversaryResults.filter((r) => r.status === 'fulfilled').length;
    const anniversariesFailed = anniversaryResults.filter((r) => r.status === 'rejected').length;

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      birthdays: {
        total: birthdaysToday.length,
        successful: birthdaysSuccessful,
        failed: birthdaysFailed,
      },
      anniversaries: {
        total: anniversariesToday.length,
        successful: anniversariesSuccessful,
        failed: anniversariesFailed,
      },
    };

    console.log('✅ Greeting cron job completed:', summary);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('❌ Greeting cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
