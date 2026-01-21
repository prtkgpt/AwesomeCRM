import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/communications/recipients - List all clients and cleaners for messaging
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can access communications
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'clients', 'cleaners', or 'all'
    const search = searchParams.get('search');

    const results: {
      clients: Array<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        type: 'client';
      }>;
      cleaners: Array<{
        id: string;
        name: string | null;
        email: string;
        phone: string | null;
        type: 'cleaner';
      }>;
    } = {
      clients: [],
      cleaners: [],
    };

    // Fetch clients
    if (!type || type === 'clients' || type === 'all') {
      const clients = await prisma.client.findMany({
        where: {
          companyId: user.companyId,
          ...(search && {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
        orderBy: { name: 'asc' },
      });

      results.clients = clients.map((client) => ({
        ...client,
        type: 'client' as const,
      }));
    }

    // Fetch cleaners (team members with their user data)
    if (!type || type === 'cleaners' || type === 'all') {
      const teamMembers = await prisma.teamMember.findMany({
        where: {
          companyId: user.companyId,
          isActive: true,
          ...(search && {
            user: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
              ],
            },
          }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: {
          user: {
            name: 'asc',
          },
        },
      });

      results.cleaners = teamMembers.map((member) => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        phone: member.user.phone,
        type: 'cleaner' as const,
      }));
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('GET /api/communications/recipients error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recipients' },
      { status: 500 }
    );
  }
}
