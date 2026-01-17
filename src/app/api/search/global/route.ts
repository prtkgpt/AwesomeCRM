import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/search/global - Global search across all entities
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const entityType = searchParams.get('type'); // Optional filter by entity type
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          clients: [],
          bookings: [],
          invoices: [],
          team: [],
        },
      });
    }

    const results: any = {
      clients: [],
      bookings: [],
      invoices: [],
      team: [],
    };

    // Search Clients
    if (!entityType || entityType === 'clients') {
      const clients = await prisma.client.findMany({
        where: {
          companyId: user.companyId,
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          addresses: {
            select: {
              street: true,
              city: true,
              state: true,
            },
            take: 1,
          },
          _count: {
            select: { bookings: true },
          },
        },
        take: limit,
      });

      results.clients = clients.map((client) => {
        const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Unknown';
        return {
          id: client.id,
          type: 'client',
          title: clientName,
          subtitle: client.email || client.phone || '',
          description: client.addresses[0]
            ? `${client.addresses[0].city}, ${client.addresses[0].state}`
            : '',
          metadata: {
            bookingsCount: client._count.bookings,
          },
          url: `/clients/${client.id}`,
        };
      });
    }

    // Search Bookings/Jobs
    if (!entityType || entityType === 'bookings') {
      // For cleaners, get their team member ID first
      let cleanerTeamMemberId: string | null = null;
      if (user.role === 'CLEANER') {
        const teamMember = await prisma.teamMember.findUnique({
          where: { userId: session.user.id },
          select: { id: true },
        });
        cleanerTeamMemberId = teamMember?.id || null;
      }

      // Build where clause based on role
      const bookingWhere: any = {
        companyId: user.companyId,
        OR: [
          { client: { firstName: { contains: query, mode: 'insensitive' } } },
          { client: { lastName: { contains: query, mode: 'insensitive' } } },
          { client: { email: { contains: query, mode: 'insensitive' } } },
          { address: { street: { contains: query, mode: 'insensitive' } } },
          { address: { city: { contains: query, mode: 'insensitive' } } },
        ],
      };

      // For cleaners, only show their assigned jobs + unassigned jobs
      if (user.role === 'CLEANER' && cleanerTeamMemberId) {
        bookingWhere.AND = {
          OR: [
            { assignedCleanerId: cleanerTeamMemberId },
            { assignedCleanerId: null },
          ],
        };
      }

      const bookings = await prisma.booking.findMany({
        where: bookingWhere,
        select: {
          id: true,
          serviceType: true,
          status: true,
          scheduledDate: true,
          finalPrice: true,
          client: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          address: {
            select: {
              street: true,
              city: true,
              state: true,
            },
          },
          assignedCleaner: {
            select: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        take: limit,
        orderBy: {
          scheduledDate: 'desc',
        },
      });

      results.bookings = bookings.map((booking) => {
        const clientName = booking.client
          ? `${booking.client.firstName || ''} ${booking.client.lastName || ''}`.trim() || 'Unknown'
          : 'Unknown';
        const cleanerName = booking.assignedCleaner?.user
          ? `${booking.assignedCleaner.user.firstName || ''} ${booking.assignedCleaner.user.lastName || ''}`.trim()
          : undefined;
        return {
          id: booking.id,
          type: 'booking',
          title: `${booking.serviceType} - ${clientName}`,
          subtitle: new Date(booking.scheduledDate).toLocaleDateString(),
          description: booking.address
            ? `${booking.address.street}, ${booking.address.city}`
            : '',
          metadata: {
            status: booking.status,
            price: booking.finalPrice,
            assignee: cleanerName,
          },
          url: `/jobs/${booking.id}`,
        };
      });
    }

    // Search Invoices
    if (!entityType || entityType === 'invoices') {
      const invoices = await prisma.invoice.findMany({
        where: {
          companyId: user.companyId,
          OR: [
            { invoiceNumber: { contains: query, mode: 'insensitive' } },
            { client: { firstName: { contains: query, mode: 'insensitive' } } },
            { client: { lastName: { contains: query, mode: 'insensitive' } } },
            { client: { email: { contains: query, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          dueDate: true,
          client: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      });

      results.invoices = invoices.map((invoice) => {
        const clientName = invoice.client
          ? `${invoice.client.firstName || ''} ${invoice.client.lastName || ''}`.trim() || 'Unknown'
          : 'Unknown';
        return {
          id: invoice.id,
          type: 'invoice',
          title: `Invoice ${invoice.invoiceNumber}`,
          subtitle: clientName,
          description: `Due: ${new Date(invoice.dueDate).toLocaleDateString()}`,
          metadata: {
            status: invoice.status,
            amount: invoice.total,
          },
          url: `/invoices/${invoice.id}`,
        };
      });
    }

    // Search Team Members (Owner/Admin only)
    if (
      user.role === 'OWNER' ||
      (user.role === 'ADMIN' && (!entityType || entityType === 'team'))
    ) {
      const teamMembers = await prisma.teamMember.findMany({
        where: {
          companyId: user.companyId,
          user: {
            OR: [
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query, mode: 'insensitive' } },
            ],
          },
        },
        select: {
          id: true,
          specialties: true,
          isActive: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              role: true,
            },
          },
        },
        take: limit,
      });

      results.team = teamMembers.map((member) => {
        const memberName = member.user
          ? `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim() || 'Unknown'
          : 'Unknown';
        return {
          id: member.id,
          type: 'team',
          title: memberName,
          subtitle: member.user?.email || member.user?.phone || '',
          description: member.specialties?.join(', ') || member.user?.role,
          metadata: {
            role: member.user?.role,
            isActive: member.isActive,
          },
          url: `/team/${member.id}/edit`,
        };
      });
    }

    // Calculate total results
    const total =
      results.clients.length +
      results.bookings.length +
      results.invoices.length +
      results.team.length;

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        query,
        total,
        clientsCount: results.clients.length,
        bookingsCount: results.bookings.length,
        invoicesCount: results.invoices.length,
        teamCount: results.team.length,
      },
    });
  } catch (error) {
    console.error('Global search error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}
