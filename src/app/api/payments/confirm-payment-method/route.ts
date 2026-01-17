import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/payments/confirm-payment-method - Confirm and save payment method to client
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json(
        { success: false, error: 'Payment processing is not configured' },
        { status: 503 }
      );
    }

    const { clientId, setupIntentId } = await request.json();

    if (!clientId || !setupIntentId) {
      return NextResponse.json(
        { success: false, error: 'Client ID and Setup Intent ID are required' },
        { status: 400 }
      );
    }

    // Get client
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: session.user.id,
      },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    // Retrieve setup intent to get payment method
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

    if (setupIntent.status !== 'succeeded') {
      return NextResponse.json(
        { success: false, error: 'Setup intent not successful' },
        { status: 400 }
      );
    }

    const paymentMethodId = setupIntent.payment_method as string;

    // Update client with payment method
    await prisma.client.update({
      where: { id: client.id },
      data: {
        stripePaymentMethodId: paymentMethodId,
        autoChargeEnabled: true, // Enable auto-charging when card is saved
      },
    });

    // Get payment method details for display
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    return NextResponse.json({
      success: true,
      data: {
        paymentMethod: {
          id: paymentMethod.id,
          brand: paymentMethod.card?.brand,
          last4: paymentMethod.card?.last4,
          expMonth: paymentMethod.card?.exp_month,
          expYear: paymentMethod.card?.exp_year,
        },
      },
    });
  } catch (error) {
    console.error('POST /api/payments/confirm-payment-method error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to confirm payment method' },
      { status: 500 }
    );
  }
}
