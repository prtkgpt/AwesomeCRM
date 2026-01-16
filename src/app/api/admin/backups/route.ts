import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/admin/backups - List all backups for the company
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user || user.role !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: 'Only company owners can manage backups' },
        { status: 403 }
      );
    }

    const backups = await prisma.companyBackup.findMany({
      where: {
        companyId: user.companyId,
        status: { in: ['ACTIVE', 'RESTORING'] },
      },
      select: {
        id: true,
        name: true,
        description: true,
        version: true,
        clientsCount: true,
        bookingsCount: true,
        invoicesCount: true,
        teamMembersCount: true,
        sizeBytes: true,
        status: true,
        createdAt: true,
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: backups,
    });
  } catch (error) {
    console.error('Get backups error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch backups' },
      { status: 500 }
    );
  }
}

// POST /api/admin/backups - Create a new backup
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, companyId: true, role: true },
    });

    if (!user || user.role !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: 'Only company owners can create backups' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    const companyId = user.companyId;

    // Collect all company data
    console.log(`Creating backup for company ${companyId}...`);

    // Fetch all data in parallel
    const [clients, bookings, invoices, teamMembers, addresses, messages, messageTemplates, pricingRules, cleaningReviews] = await Promise.all([
      prisma.client.findMany({
        where: { companyId },
        include: {
          addresses: true,
          preferences: true,
          referralCreditTransactions: true,
        },
      }),
      prisma.booking.findMany({
        where: { companyId },
        include: {
          jobChecklist: true,
        },
      }),
      prisma.invoice.findMany({
        where: { companyId },
      }),
      prisma.teamMember.findMany({
        where: { companyId },
      }),
      prisma.address.findMany({
        where: {
          client: {
            companyId,
          },
        },
      }),
      prisma.message.findMany({
        where: { companyId },
      }),
      prisma.messageTemplate.findMany({
        where: { companyId },
      }),
      prisma.pricingRule.findMany({
        where: { companyId },
      }),
      prisma.cleaningReview.findMany({
        where: { companyId },
      }),
    ]);

    // Create backup data object
    const backupData = {
      clients,
      bookings,
      invoices,
      teamMembers,
      addresses,
      messages,
      messageTemplates,
      pricingRules,
      cleaningReviews,
      exportedAt: new Date().toISOString(),
    };

    // Calculate approximate size
    const dataString = JSON.stringify(backupData);
    const sizeBytes = Buffer.byteLength(dataString, 'utf8');

    // Generate name if not provided
    const backupName = name || `Backup ${new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    // Create backup record
    const backup = await prisma.companyBackup.create({
      data: {
        companyId,
        name: backupName,
        description: description || null,
        version: '1.0',
        data: backupData,
        clientsCount: clients.length,
        bookingsCount: bookings.length,
        invoicesCount: invoices.length,
        teamMembersCount: teamMembers.length,
        sizeBytes,
        createdById: user.id,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        description: true,
        clientsCount: true,
        bookingsCount: true,
        invoicesCount: true,
        teamMembersCount: true,
        sizeBytes: true,
        createdAt: true,
      },
    });

    console.log(`Backup created: ${backup.id} (${(sizeBytes / 1024).toFixed(2)} KB)`);

    return NextResponse.json({
      success: true,
      data: backup,
      message: `Backup created successfully with ${clients.length} clients, ${bookings.length} bookings, ${invoices.length} invoices`,
    });
  } catch (error) {
    console.error('Create backup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}
