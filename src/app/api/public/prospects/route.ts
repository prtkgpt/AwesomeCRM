import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Validation schema for prospect form
const prospectSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  businessName: z.string().min(2, 'Business name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email('Valid email is required'),
  area: z.string().min(2, 'Service area is required'),
  website: z.string().optional(),
  source: z.string().optional().default('SWITCH_PAGE'),
});

export async function POST(request: NextRequest) {
  // Rate limit: 5 submissions per minute per IP
  const rateLimited = checkRateLimit(request, 'prospect');
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();

    // Validate input
    const validatedData = prospectSchema.parse(body);

    // Check if prospect with same email already exists
    const existingProspect = await prisma.prospect.findFirst({
      where: { email: validatedData.email },
    });

    if (existingProspect) {
      // Update existing prospect with new info
      const updated = await prisma.prospect.update({
        where: { id: existingProspect.id },
        data: {
          fullName: validatedData.fullName,
          businessName: validatedData.businessName,
          phone: validatedData.phone,
          area: validatedData.area,
          website: validatedData.website || existingProspect.website,
          source: validatedData.source,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Thank you! We have updated your information and will be in touch soon.',
      });
    }

    // Create new prospect
    const prospect = await prisma.prospect.create({
      data: {
        fullName: validatedData.fullName,
        businessName: validatedData.businessName,
        phone: validatedData.phone,
        email: validatedData.email,
        area: validatedData.area,
        website: validatedData.website,
        source: validatedData.source,
      },
    });

    return NextResponse.json({
      success: true,
      data: prospect,
      message: 'Thank you! Our team will reach out to you shortly.',
    });
  } catch (error) {
    console.error('Prospect submission error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0]?.message || 'Invalid input data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to submit. Please try again.' },
      { status: 500 }
    );
  }
}
