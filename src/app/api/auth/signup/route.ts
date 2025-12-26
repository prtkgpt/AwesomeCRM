import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signupSchema } from '@/lib/validations';

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

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 10);

    // Create user with default message templates
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        passwordHash,
        name: validatedData.name,
        phone: validatedData.phone,
        businessName: validatedData.businessName,
        messageTemplates: {
          create: [
            {
              type: 'CONFIRMATION',
              name: 'Booking Confirmation',
              template:
                'Hi {{clientName}}! Your cleaning is confirmed for {{date}} at {{time}}. See you then! - {{businessName}}',
              isActive: true,
            },
            {
              type: 'REMINDER',
              name: '24hr Reminder',
              template:
                'Hi {{clientName}}! Reminder: Your cleaning is tomorrow at {{time}}. Looking forward to it! - {{businessName}}',
              isActive: true,
            },
            {
              type: 'ON_MY_WAY',
              name: 'On My Way',
              template:
                "Hi {{clientName}}! I'm on my way to {{address}}. See you in about 15 minutes! - {{businessName}}",
              isActive: true,
            },
            {
              type: 'THANK_YOU',
              name: 'Thank You',
              template:
                'Thank you {{clientName}}! Your home is all clean. Hope you love it! If you have a moment, I would greatly appreciate a review. - {{businessName}}',
              isActive: true,
            },
            {
              type: 'PAYMENT_REQUEST',
              name: 'Payment Request',
              template:
                'Hi {{clientName}}! Your cleaning is complete. The total is {{price}}. You can pay using this link: {{paymentLink}} - {{businessName}}',
              isActive: true,
            },
          ],
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        businessName: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: user,
      message: 'Account created successfully',
    });
  } catch (error) {
    console.error('Signup error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
