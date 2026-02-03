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

// GET /api/platform/blog/[id] - Get a blog post for editing
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await verifyPlatformAdmin(session))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const post = await prisma.blogPost.findUnique({
      where: { id: params.id },
      include: {
        author: { select: { name: true, email: true } },
      },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error('Platform blog: get error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}

// PATCH /api/platform/blog/[id] - Update a blog post
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await verifyPlatformAdmin(session))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const post = await prisma.blogPost.findUnique({
      where: { id: params.id },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
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

    // If changing slug, check uniqueness
    if (slug && slug !== post.slug) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(slug)) {
        return NextResponse.json(
          { success: false, error: 'Slug must be lowercase letters, numbers, and hyphens only' },
          { status: 400 }
        );
      }
      const existing = await prisma.blogPost.findUnique({ where: { slug } });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'A post with this slug already exists' },
          { status: 409 }
        );
      }
    }

    // Set publishedAt when publishing for the first time
    const isNewlyPublished = published === true && !post.published;

    const updated = await prisma.blogPost.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(slug !== undefined && { slug }),
        ...(excerpt !== undefined && { excerpt }),
        ...(content !== undefined && { content }),
        ...(coverImage !== undefined && { coverImage }),
        ...(metaTitle !== undefined && { metaTitle }),
        ...(metaDescription !== undefined && { metaDescription }),
        ...(published !== undefined && { published }),
        ...(isNewlyPublished && { publishedAt: new Date() }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Post updated',
    });
  } catch (error) {
    console.error('Platform blog: update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update post' },
      { status: 500 }
    );
  }
}

// DELETE /api/platform/blog/[id] - Delete a blog post
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await verifyPlatformAdmin(session))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const post = await prisma.blogPost.findUnique({
      where: { id: params.id },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    await prisma.blogPost.delete({ where: { id: params.id } });

    return NextResponse.json({
      success: true,
      message: 'Post deleted',
    });
  } catch (error) {
    console.error('Platform blog: delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
