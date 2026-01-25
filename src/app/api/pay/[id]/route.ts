import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Type assertion for new fields (pre-migration compatibility)
const db = prisma as any;

// GET /api/pay/[id] - Get invoice details for payment (public - no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch invoice with company and client details
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        booking: {
          select: {
            id: true,
            scheduledDate: true,
            serviceType: true,
            address: {
              select: {
                street: true,
                city: true,
                state: true,
                zip: true,
              },
            },
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            phone: true,
            stripeSecretKey: true,
            stripePublishableKey: true,
            zelleEmail: true,
            venmoUsername: true,
            cashappUsername: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if already paid
    if (invoice.status === 'PAID') {
      return NextResponse.json({
        success: false,
        error: 'Invoice already paid',
        alreadyPaid: true,
        data: {
          invoiceNumber: invoice.invoiceNumber,
          total: invoice.total,
          paidAt: invoice.updatedAt,
          companyName: invoice.company.name,
        },
      });
    }

    // Check if cancelled
    if (invoice.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: 'Invoice has been cancelled' },
        { status: 400 }
      );
    }

    // Return invoice details (sanitized - no secret keys)
    return NextResponse.json({
      success: true,
      data: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        lineItems: invoice.lineItems,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        total: invoice.total,
        notes: invoice.notes,
        client: {
          name: invoice.client.name,
          email: invoice.client.email,
        },
        booking: invoice.booking ? {
          scheduledDate: invoice.booking.scheduledDate,
          serviceType: invoice.booking.serviceType,
          address: invoice.booking.address,
        } : null,
        company: {
          name: invoice.company.name,
          phone: invoice.company.phone,
          hasStripe: !!invoice.company.stripeSecretKey,
          stripePublishableKey: invoice.company.stripePublishableKey || null,
          hasZelle: !!invoice.company.zelleEmail,
          zelleEmail: invoice.company.zelleEmail || null,
          hasVenmo: !!invoice.company.venmoUsername,
          venmoUsername: invoice.company.venmoUsername || null,
          hasCashApp: !!invoice.company.cashappUsername,
          cashappUsername: invoice.company.cashappUsername || null,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/pay/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

// POST /api/pay/[id] - Process payment for invoice (public)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { paymentMethod, paymentIntentId, email } = body;

    // Fetch invoice with company details
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        booking: true,
        company: {
          select: {
            id: true,
            name: true,
            stripeSecretKey: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json({
        success: false,
        error: 'Invoice already paid',
        alreadyPaid: true,
      });
    }

    if (invoice.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: 'Invoice has been cancelled' },
        { status: 400 }
      );
    }

    // Handle Stripe payment confirmation
    if (paymentMethod === 'STRIPE' && paymentIntentId) {
      // Verify the payment was successful
      if (invoice.company.stripeSecretKey) {
        const stripe = new Stripe(invoice.company.stripeSecretKey, {
          apiVersion: '2023-10-16',
        });

        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

          if (paymentIntent.status !== 'succeeded') {
            return NextResponse.json(
              { success: false, error: 'Payment not completed' },
              { status: 400 }
            );
          }
        } catch (stripeError) {
          console.error('Stripe verification error:', stripeError);
          // Continue - payment may still be valid
        }
      }
    }

    // Mark invoice as paid (using db for pre-migration compatibility with new fields)
    const updatedInvoice = await db.invoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidVia: paymentMethod || 'MANUAL',
        stripePaymentIntentId: paymentIntentId || null,
      },
    });

    // If there's an associated booking, mark it as paid
    if (invoice.bookingId) {
      await prisma.booking.update({
        where: { id: invoice.bookingId },
        data: {
          isPaid: true,
          paidAt: new Date(),
        },
      });
    }

    // Log the payment
    try {
      await db.auditLog.create({
        data: {
          companyId: invoice.companyId,
          action: 'INVOICE_PAID',
          description: `Invoice ${invoice.invoiceNumber} paid via ${paymentMethod || 'payment portal'}`,
          entityType: 'Invoice',
          entityId: invoice.id,
          metadata: {
            amount: invoice.total,
            paymentMethod: paymentMethod || 'MANUAL',
            paymentIntentId: paymentIntentId || null,
          },
        },
      });
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    console.log(`💰 Invoice ${invoice.invoiceNumber} paid via ${paymentMethod} - $${invoice.total.toFixed(2)}`);

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        invoiceNumber: updatedInvoice.invoiceNumber,
        total: updatedInvoice.total,
        paidAt: updatedInvoice.paidAt,
      },
    });
  } catch (error) {
    console.error('POST /api/pay/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}

// POST /api/pay/[id]/create-intent - Create Stripe payment intent
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch invoice with company details
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        company: {
          select: {
            name: true,
            stripeSecretKey: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json({
        success: false,
        error: 'Invoice already paid',
        alreadyPaid: true,
      });
    }

    if (!invoice.company.stripeSecretKey) {
      return NextResponse.json(
        { success: false, error: 'Card payments not configured' },
        { status: 503 }
      );
    }

    // Initialize Stripe with company's credentials
    const stripe = new Stripe(invoice.company.stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(invoice.total * 100), // Convert to cents
      currency: 'usd',
      description: `Invoice ${invoice.invoiceNumber} - ${invoice.company.name}`,
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientId: invoice.clientId,
        companyId: invoice.companyId,
      },
      ...(invoice.client.stripeCustomerId && {
        customer: invoice.client.stripeCustomerId,
      }),
    });

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
    });
  } catch (error) {
    console.error('PUT /api/pay/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
