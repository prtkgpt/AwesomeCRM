import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/team/invite/[token] - Get invitation details
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    console.log(`🔍 Looking up invitation with token: ${params.token}`);

    const invitation = await prisma.invitation.findUnique({
      where: { token: params.token },
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
      console.error(`❌ Invitation not found for token: ${params.token}`);
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

    return NextResponse.json({
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        company: {
          name: invitation.company.name,
          slug: invitation.company.slug || invitation.company.id, // Fallback to ID if slug is null
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
