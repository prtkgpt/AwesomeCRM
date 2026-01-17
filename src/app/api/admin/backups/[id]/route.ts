import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/admin/backups/[id] - Get backup details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        { success: false, error: 'Only company owners can view backups' },
        { status: 403 }
      );
    }

    const backup = await prisma.companyBackup.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
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
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!backup) {
      return NextResponse.json(
        { success: false, error: 'Backup not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: backup,
    });
  } catch (error) {
    console.error('Get backup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch backup' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/backups/[id] - Delete a backup (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        { success: false, error: 'Only company owners can delete backups' },
        { status: 403 }
      );
    }

    const backup = await prisma.companyBackup.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!backup) {
      return NextResponse.json(
        { success: false, error: 'Backup not found' },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.companyBackup.update({
      where: { id: params.id },
      data: { status: 'DELETED' },
    });

    return NextResponse.json({
      success: true,
      message: 'Backup deleted successfully',
    });
  } catch (error) {
    console.error('Delete backup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete backup' },
      { status: 500 }
    );
  }
}
