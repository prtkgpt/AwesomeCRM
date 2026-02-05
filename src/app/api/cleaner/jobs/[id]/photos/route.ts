import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const uploadPhotoSchema = z.object({
  type: z.enum(['BEFORE', 'AFTER', 'ISSUE']),
  url: z.string().url('Valid URL required'),
  caption: z.string().optional(),
  tags: z.array(z.string()).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Get all photos for a job
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: bookingId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
      include: { teamMember: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check booking exists and user has access
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        companyId: user.companyId,
        // Cleaners can only see their own jobs
        ...(user.role === 'CLEANER' && user.teamMember
          ? { assignedTo: user.teamMember.id }
          : {}),
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const photos = await prisma.jobPhoto.findMany({
      where: { bookingId },
      orderBy: [{ type: 'asc' }, { uploadedAt: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: photos,
    });
  } catch (error) {
    console.error('Get job photos error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Upload a photo for a job
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: bookingId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
      include: { teamMember: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Cleaners, admins, and owners can upload photos
    if (!['CLEANER', 'ADMIN', 'OWNER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check booking exists and user has access
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        companyId: user.companyId,
        // Cleaners can only upload to their own jobs
        ...(user.role === 'CLEANER' && user.teamMember
          ? { assignedTo: user.teamMember.id }
          : {}),
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = uploadPhotoSchema.parse(body);

    const photo = await prisma.jobPhoto.create({
      data: {
        bookingId,
        type: validatedData.type,
        url: validatedData.url,
        caption: validatedData.caption,
        tags: validatedData.tags || [],
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: photo,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Upload job photo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete a photo from a job
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: bookingId } = await params;
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
    const photoId = searchParams.get('photoId');

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }

    const photo = await prisma.jobPhoto.findFirst({
      where: { id: photoId, bookingId },
      include: { booking: true },
    });

    if (!photo || photo.booking.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Only owner of photo or admins can delete
    if (photo.uploadedById !== session.user.id && !['ADMIN', 'OWNER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.jobPhoto.delete({
      where: { id: photoId },
    });

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully',
    });
  } catch (error) {
    console.error('Delete job photo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
