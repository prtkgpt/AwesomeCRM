import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to generate slug from company name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// GET /api/team/invite/[token] - Get invitation details
export async function GET(
  request: NextRequest,
  context: { params: { token: string } | Promise<{ token: string }> }
) {
  try {
    // Handle both sync and async params (Next.js 14/15 compatibility)
    const params = await Promise.resolve(context.params);
    const token = params.token;

    console.log(`🔍 Looking up invitation with token: ${token}`);
    console.log(`🔍 Full params:`, params);
    console.log(`🔍 Request URL:`, request.url);

    if (!token) {
      console.error(`❌ No token provided in params`);
      return NextResponse.json(
        { error: 'Invalid invitation link' },
        { status: 400 }
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!invitation) {
      console.error(`❌ Invitation not found for token: ${token}`);
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Found invitation for: ${invitation.email}, status: ${invitation.status}`);

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(invitation.expiresAt);
    if (now > expiresAt) {
      console.error(`⏰ Invitation expired. Now: ${now.toISOString()}, Expires: ${expiresAt.toISOString()}`);
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    // Check if already accepted
    if (invitation.status !== 'PENDING') {
      console.error(`🚫 Invitation already used. Status: ${invitation.status}`);
      return NextResponse.json(
        { error: 'Invitation has already been used' },
        { status: 400 }
      );
    }

    console.log(`✨ Invitation valid for: ${invitation.email}`);

    // Generate slug from company name if not exists
    const slug = invitation.company.slug || generateSlug(invitation.company.name);

    // Update company with generated slug if it was null
    if (!invitation.company.slug) {
      console.log(`📝 Updating company with generated slug: ${slug}`);
      await prisma.company.update({
        where: { id: invitation.company.id },
        data: { slug },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        company: {
          name: invitation.company.name,
          slug,
        },
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error('❌ GET /api/team/invite/[token] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    );
  }
}
