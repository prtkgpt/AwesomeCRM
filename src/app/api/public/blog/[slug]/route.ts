import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/public/blog/[slug] - Get a published blog post by slug (public)
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug: params.slug },
      include: {
        author: { select: { name: true } },
      },
    });

    if (!post || !post.published) {
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
    console.error('Public blog: get post error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}
