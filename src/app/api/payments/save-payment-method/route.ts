import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/payments/save-payment-method - Save customer payment method for auto-charging
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { success: false, error: 'Payment processing is not configured' },
        { status: 503 }
      );
    }

    const { clientId } = await request.json();

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Get user's company
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get client details
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        companyId: user.companyId,
      },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Customer';

    // Create or retrieve Stripe customer
    let stripeCustomerId = client.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: client.email || undefined,
        name: clientName,
        phone: client.phone || undefined,
        metadata: {
          clientId: client.id,
          companyId: user.companyId,
        },
      });

      stripeCustomerId = customer.id;

      await prisma.client.update({
        where: { id: client.id },
        data: { stripeCustomerId },
      });
    }

    // Create SetupIntent for saving payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      metadata: {
        clientId: client.id,
        companyId: user.companyId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
      },
    });
  } catch (error) {
    console.error('POST /api/payments/save-payment-method error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create setup intent' },
      { status: 500 }
    );
  }
}
