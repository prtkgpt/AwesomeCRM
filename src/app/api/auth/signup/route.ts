import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signupSchema } from '@/lib/validations';

// Helper to generate slug from company name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Generate company slug from business name or email
    const companyName = validatedData.businessName || validatedData.email.split('@')[0];
    let slug = generateSlug(companyName);

    // Check if slug exists, if so append random string
    const existingCompany = await prisma.company.findUnique({
      where: { slug },
    });

    if (existingCompany) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 10);

    // Create company and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create company
      const company = await tx.company.create({
        data: {
          name: companyName,
          slug,
          email: validatedData.email,
          phone: validatedData.phone,
        },
      });

      // Create user with OWNER role
      const user = await tx.user.create({
        data: {
          email: validatedData.email,
          passwordHash,
          name: validatedData.name,
          phone: validatedData.phone,
          businessName: validatedData.businessName,
          companyId: company.id,
          role: 'OWNER',
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          businessName: true,
          companyId: true,
          role: true,
          createdAt: true,
        },
      });

      // Create default message templates
      await tx.messageTemplate.createMany({
        data: [
          {
            companyId: company.id,
            userId: user.id,
            type: 'CONFIRMATION',
            name: 'Booking Confirmation',
            template:
              'Hi {{clientName}}! Your cleaning is confirmed for {{date}} at {{time}}. See you then! - {{businessName}}',
            isActive: true,
          },
          {
            companyId: company.id,
            userId: user.id,
            type: 'REMINDER',
            name: '24hr Reminder',
            template:
              'Hi {{clientName}}! Reminder: Your cleaning is tomorrow at {{time}}. Looking forward to it! - {{businessName}}',
            isActive: true,
          },
          {
            companyId: company.id,
            userId: user.id,
            type: 'ON_MY_WAY',
            name: 'On My Way',
            template:
              "Hi {{clientName}}! I'm on my way to {{address}}. See you in about 15 minutes! - {{businessName}}",
            isActive: true,
          },
          {
            companyId: company.id,
            userId: user.id,
            type: 'THANK_YOU',
            name: 'Thank You',
            template:
              'Thank you {{clientName}}! Your home is all clean. Hope you love it! If you have a moment, I would greatly appreciate a review. - {{businessName}}',
            isActive: true,
          },
          {
            companyId: company.id,
            userId: user.id,
            type: 'PAYMENT_REQUEST',
            name: 'Payment Request',
            template:
              'Hi {{clientName}}! Your cleaning is complete. The total is {{price}}. You can pay using this link: {{paymentLink}} - {{businessName}}',
            isActive: true,
          },
        ],
      });

      return { user, company };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result.user,
        company: {
          id: result.company.id,
          name: result.company.name,
          slug: result.company.slug,
        },
      },
      message: 'Account created successfully',
    });
  } catch (error) {
    console.error('Signup error:', error);
    console.error('Error type:', typeof error);
    console.error('Error stringified:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

    // Show more specific error for Zod validation
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }

    // Show Prisma errors for debugging
    if (error instanceof Error) {
      // Check for unique constraint violation
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { success: false, error: 'This email or company name is already taken' },
          { status: 400 }
        );
      }

      // TODO: Remove this after debugging - temporarily showing errors in production
      // Return the actual error message for debugging
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create account',
          details: error.message,
          errorName: error.name,
          errorStack: error.stack?.split('\n').slice(0, 3).join('\n')
        },
        { status: 500 }
      );
    }

    // Catch-all for any other error types
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create account',
        details: String(error),
        errorType: typeof error
      },
      { status: 500 }
    );
  }
}
