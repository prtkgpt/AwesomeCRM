import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Simple test endpoint to debug client API issues
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const steps: string[] = [];

  try {
    steps.push('1. Starting API call');

    // Step 1: Check params
    steps.push(`2. Params received: ${JSON.stringify(params)}`);
    const clientId = params.id;
    steps.push(`3. Client ID: ${clientId}`);

    // Step 2: Check session
    steps.push('4. Getting session...');
    const session = await getServerSession(authOptions);
    steps.push(`5. Session user ID: ${session?.user?.id || 'NONE'}`);

    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        steps,
      }, { status: 401 });
    }

    // Step 3: Get user
    steps.push('6. Getting user...');
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });
    steps.push(`7. User companyId: ${user?.companyId || 'NONE'}`);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        steps,
      }, { status: 404 });
    }

    // Step 4: Simple client query (no includes)
    steps.push('8. Querying client (simple)...');
    const clientBasic = await prisma.client.findFirst({
      where: {
        id: clientId,
        companyId: user.companyId,
      },
    });
    steps.push(`9. Basic client found: ${!!clientBasic}`);

    if (!clientBasic) {
      return NextResponse.json({
        success: false,
        error: 'Client not found',
        steps,
        debug: { clientId, companyId: user.companyId }
      }, { status: 404 });
    }

    // Step 5: Client with addresses
    steps.push('10. Querying client with addresses...');
    const clientWithAddresses = await prisma.client.findFirst({
      where: { id: clientId },
      include: { addresses: true },
    });
    steps.push(`11. Addresses count: ${clientWithAddresses?.addresses?.length || 0}`);

    // Step 6: Client with bookings
    steps.push('12. Querying client with bookings...');
    const clientWithBookings = await prisma.client.findFirst({
      where: { id: clientId },
      include: {
        bookings: {
          take: 5,
          orderBy: { scheduledDate: 'desc' },
        },
      },
    });
    steps.push(`13. Bookings count: ${clientWithBookings?.bookings?.length || 0}`);

    // Step 7: Full query
    steps.push('14. Querying client with full includes...');
    const clientFull = await prisma.client.findFirst({
      where: { id: clientId },
      include: {
        addresses: true,
        preferences: true,
        bookings: {
          take: 20,
          include: {
            address: true,
            assignee: {
              include: {
                user: {
                  select: { name: true },
                },
              },
            },
          },
          orderBy: { scheduledDate: 'desc' },
        },
      },
    });
    steps.push('15. Full query completed!');

    return NextResponse.json({
      success: true,
      steps,
      data: {
        id: clientFull?.id,
        name: clientFull?.name,
        email: clientFull?.email,
        addressCount: clientFull?.addresses?.length || 0,
        bookingCount: clientFull?.bookings?.length || 0,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json({
      success: false,
      error: errorMessage,
      steps,
      stack: errorStack,
    }, { status: 500 });
  }
}
