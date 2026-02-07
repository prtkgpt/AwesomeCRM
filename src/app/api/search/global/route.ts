import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';

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
          estimates: [],
          team: [],
        },
      });
    }

    const results: any = {
      clients: [],
      bookings: [],
      invoices: [],
      estimates: [],
      team: [],
    };

    // Search Clients
    if (!entityType || entityType === 'clients') {
      const clients = await prisma.client.findMany({
        where: {
          companyId: user.companyId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
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

      results.clients = clients.map((client) => ({
        id: client.id,
        type: 'client',
        title: client.name,
        subtitle: client.email || client.phone || '',
        description: client.addresses[0]
          ? `${client.addresses[0].city}, ${client.addresses[0].state}`
          : '',
        metadata: {
          bookingsCount: client._count.bookings,
        },
        url: `/clients/${client.id}`,
      }));
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
          { client: { name: { contains: query, mode: 'insensitive' } } },
          { client: { email: { contains: query, mode: 'insensitive' } } },
          { address: { street: { contains: query, mode: 'insensitive' } } },
          { address: { city: { contains: query, mode: 'insensitive' } } },
        ],
      };

      // For cleaners, only show their assigned jobs + unassigned jobs
      if (user.role === 'CLEANER' && cleanerTeamMemberId) {
        bookingWhere.AND = {
          OR: [
            { assignedTo: cleanerTeamMemberId },
            { assignedTo: null },
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
          price: true,
          client: {
            select: {
              name: true,
            },
          },
          address: {
            select: {
              street: true,
              city: true,
              state: true,
            },
          },
          assignee: {
            select: {
              user: {
                select: {
                  name: true,
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

      results.bookings = bookings.map((booking) => ({
        id: booking.id,
        type: 'booking',
        title: `${booking.serviceType} - ${booking.client.name}`,
        subtitle: formatDate(booking.scheduledDate),
        description: booking.address
          ? `${booking.address.street}, ${booking.address.city}`
          : '',
        metadata: {
          status: booking.status,
          price: booking.price,
          assignee: booking.assignee?.user.name,
        },
        url: `/jobs/${booking.id}`,
      }));
    }

    // Search Invoices
    if (!entityType || entityType === 'invoices') {
      const invoices = await prisma.invoice.findMany({
        where: {
          companyId: user.companyId,
          OR: [
            { invoiceNumber: { contains: query, mode: 'insensitive' } },
            { client: { name: { contains: query, mode: 'insensitive' } } },
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
              name: true,
            },
          },
        },
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      });

      results.invoices = invoices.map((invoice) => ({
        id: invoice.id,
        type: 'invoice',
        title: `Invoice ${invoice.invoiceNumber}`,
        subtitle: invoice.client.name,
        description: `Due: ${formatDate(invoice.dueDate)}`,
        metadata: {
          status: invoice.status,
          amount: invoice.total,
        },
        url: `/invoices/${invoice.id}`,
      }));
    }

    // Search Estimates
    if (!entityType || entityType === 'estimates') {
      const estimates = await prisma.booking.findMany({
        where: {
          companyId: user.companyId,
          estimateToken: { not: null },
          OR: [
            { client: { name: { contains: query, mode: 'insensitive' } } },
            { client: { email: { contains: query, mode: 'insensitive' } } },
            { address: { street: { contains: query, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true,
          serviceType: true,
          estimateAccepted: true,
          price: true,
          createdAt: true,
          client: {
            select: {
              name: true,
            },
          },
          address: {
            select: {
              street: true,
              city: true,
            },
          },
        },
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      });

      results.estimates = estimates.map((estimate) => ({
        id: estimate.id,
        type: 'estimate',
        title: `${estimate.serviceType} Estimate`,
        subtitle: estimate.client.name,
        description: estimate.address
          ? `${estimate.address.street}, ${estimate.address.city}`
          : '',
        metadata: {
          status: estimate.estimateAccepted ? 'ACCEPTED' : 'PENDING',
          price: estimate.price,
        },
        url: `/estimates?id=${estimate.id}`,
      }));
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
              { name: { contains: query, mode: 'insensitive' } },
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
              name: true,
              email: true,
              phone: true,
              role: true,
            },
          },
        },
        take: limit,
      });

      results.team = teamMembers.map((member) => ({
        id: member.id,
        type: 'team',
        title: member.user.name || 'Unknown',
        subtitle: member.user.email || member.user.phone || '',
        description: member.specialties?.join(', ') || member.user.role,
        metadata: {
          role: member.user.role,
          isActive: member.isActive,
        },
        url: `/team/${member.id}/edit`,
      }));
    }

    // Calculate total results
    const total =
      results.clients.length +
      results.bookings.length +
      results.invoices.length +
      results.estimates.length +
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
        estimatesCount: results.estimates.length,
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
