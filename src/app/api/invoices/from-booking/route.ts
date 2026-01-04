import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/invoices/from-booking - Generate invoice from a booking
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, tax = 0, notes, terms, dueInDays = 30 } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch the booking
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        companyId: user.companyId,
      },
      include: {
        client: true,
        address: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if booking already has an invoice
    const existingInvoice = await prisma.invoice.findFirst({
      where: { bookingId },
    });

    if (existingInvoice) {
      return NextResponse.json(
        { error: 'Booking already has an invoice', data: existingInvoice },
        { status: 400 }
      );
    }

    // Create line items from booking
    const serviceTypeLabels: Record<string, string> = {
      STANDARD: 'Standard Cleaning',
      DEEP: 'Deep Cleaning',
      MOVE_OUT: 'Move-Out Cleaning',
    };

    const lineItems = [
      {
        description: `${serviceTypeLabels[booking.serviceType] || booking.serviceType} - ${booking.address.street}, ${booking.address.city}`,
        quantity: 1,
        rate: booking.price,
        amount: booking.price,
      },
    ];

    const subtotal = booking.price;
    const taxAmount = tax;
    const total = subtotal + taxAmount;

    // Generate invoice number
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${randomPart}`;

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueInDays);

    const invoice = await prisma.invoice.create({
      data: {
        companyId: user.companyId,
        userId: session.user.id,
        clientId: booking.clientId,
        bookingId: booking.id,
        invoiceNumber,
        dueDate,
        lineItems,
        subtotal,
        tax: taxAmount,
        total,
        notes: notes || `Service completed on ${new Date(booking.scheduledDate).toLocaleDateString()}`,
        terms: terms || 'Payment due within 30 days',
        status: 'DRAFT',
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        booking: {
          select: {
            id: true,
            scheduledDate: true,
            serviceType: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error generating invoice from booking:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
