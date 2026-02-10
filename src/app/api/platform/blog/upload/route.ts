import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { put } from '@vercel/blob';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let formData;
    try {
      formData = await req.formData();
    } catch (formError) {
      console.error('FormData parsing error:', formError);
      return NextResponse.json(
        { success: false, error: 'Failed to parse upload. File may be too large.' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type "${file.type}". Allowed: JPG, PNG, GIF, WebP` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size: 5MB` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const filename = `blog/cover-${timestamp}-${randomStr}.${ext}`;

    // Upload to Vercel Blob storage
    try {
      const blob = await put(filename, file, {
        access: 'public',
        addRandomSuffix: false,
      });

      return NextResponse.json({
        success: true,
        data: { url: blob.url },
      });
    } catch (uploadError) {
      console.error('Vercel Blob upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to upload image. Please check BLOB_READ_WRITE_TOKEN configuration.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Blog image upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to upload image: ${errorMessage}` },
      { status: 500 }
    );
  }
}
