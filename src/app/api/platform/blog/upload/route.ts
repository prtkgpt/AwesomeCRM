import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir, access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';

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
    const filename = `cover-${timestamp}-${randomStr}.${ext}`;

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'blog');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (mkdirError) {
      console.error('Failed to create upload directory:', mkdirError);
      return NextResponse.json(
        { success: false, error: 'Server configuration error: cannot create upload directory' },
        { status: 500 }
      );
    }

    // Check write permissions
    try {
      await access(uploadDir, constants.W_OK);
    } catch {
      console.error('Upload directory not writable:', uploadDir);
      return NextResponse.json(
        { success: false, error: 'Server configuration error: upload directory not writable' },
        { status: 500 }
      );
    }

    // Write file
    let bytes;
    try {
      bytes = await file.arrayBuffer();
    } catch (bufferError) {
      console.error('Failed to read file buffer:', bufferError);
      return NextResponse.json(
        { success: false, error: 'Failed to read uploaded file' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadDir, filename);

    try {
      await writeFile(filePath, buffer);
    } catch (writeError) {
      console.error('Failed to write file:', writeError);
      return NextResponse.json(
        { success: false, error: 'Failed to save image to disk' },
        { status: 500 }
      );
    }

    // Return public URL
    const url = `/uploads/blog/${filename}`;

    return NextResponse.json({
      success: true,
      data: { url },
    });
  } catch (error) {
    console.error('Blog image upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to upload image: ${errorMessage}` },
      { status: 500 }
    );
  }
}
