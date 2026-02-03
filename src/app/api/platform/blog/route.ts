import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Helper: verify platform admin
async function verifyPlatformAdmin(session: any) {
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPlatformAdmin: true },
  });
  return user?.isPlatformAdmin === true;
}

// GET /api/platform/blog - List all blog posts (admin view)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await verifyPlatformAdmin(session))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const posts = await prisma.blogPost.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        published: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: posts,
    });
  } catch (error) {
    console.error('Platform blog: list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}

// POST /api/platform/blog - Create a new blog post
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await verifyPlatformAdmin(session))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      slug,
      excerpt,
      content,
      coverImage,
      metaTitle,
      metaDescription,
      published,
    } = body;

    if (!title || !slug || !content) {
      return NextResponse.json(
        { success: false, error: 'Title, slug, and content are required' },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { success: false, error: 'Slug must be lowercase letters, numbers, and hyphens only' },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await prisma.blogPost.findUnique({
      where: { slug },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A post with this slug already exists' },
        { status: 409 }
      );
    }

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        excerpt: excerpt || null,
        content,
        coverImage: coverImage || null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        authorId: session!.user!.id,
        published: published === true,
        publishedAt: published === true ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: post,
      message: published ? 'Post published!' : 'Draft saved',
    });
  } catch (error) {
    console.error('Platform blog: create error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create blog post' },
      { status: 500 }
    );
  }
}
