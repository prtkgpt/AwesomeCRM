// ============================================
// CleanDayCRM - Gift Card Purchase API (Public)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import { z } from 'zod';
import { addMonths, parseISO } from 'date-fns';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const purchaseSchema = z.object({
  companySlug: z.string().min(1),
  amount: z.number().min(25).max(500),
  recipientEmail: z.string().email(),
  recipientName: z.string().min(1),
  senderName: z.string().min(1),
  senderEmail: z.string().email(),
  message: z.string().max(500).optional(),
  deliveryDate: z.string().datetime().optional(),
});

// POST /api/payments/gift-cards/purchase - Public purchase endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = purchaseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const {
      companySlug,
      amount,
      recipientEmail,
      recipientName,
      senderName,
      senderEmail,
      message,
      deliveryDate,
    } = validation.data;

    // Find company by slug
    const company = await prisma.company.findFirst({
      where: { slug: companySlug, isActive: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Generate gift card code
    const code = `GC-${generateToken(8).toUpperCase()}`;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create Stripe checkout session for gift card purchase
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: senderEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${company.name} Gift Card`,
              description: `$${amount} gift card for ${recipientName}`,
              images: company.logo ? [company.logo] : undefined,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/${companySlug}/gift-card-sent?code=${code}`,
      cancel_url: `${baseUrl}/${companySlug}/gift-cards?cancelled=true`,
      metadata: {
        type: 'gift_card_purchase',
        companyId: company.id,
        giftCardCode: code,
        amount: amount.toString(),
        recipientEmail,
        recipientName,
        senderName,
        senderEmail,
        message: message || '',
        deliveryDate: deliveryDate || '',
      },
    });

    // Create pending gift card record
    await prisma.giftCard.create({
      data: {
        companyId: company.id,
        code,
        originalAmount: amount,
        currentBalance: amount,
        recipientEmail,
        recipientName,
        senderName,
        senderEmail,
        message,
        deliveryDate: deliveryDate ? parseISO(deliveryDate) : null,
        expiresAt: addMonths(new Date(), 12),
        isActive: false, // Will be activated after payment
        isPending: true,
        stripeCheckoutSessionId: checkoutSession.id,
      },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('POST /api/payments/gift-cards/purchase error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process gift card purchase' },
      { status: 500 }
    );
  }
}
