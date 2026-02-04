import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/invoices - List all invoices
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');

    const where: any = { companyId: user.companyId };
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

// POST /api/invoices - Create a new invoice
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, clientId, lineItems, tax, notes, terms, dueInDays = 30 } = body;

    if (!clientId || !lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { error: 'Client ID and line items are required' },
        { status: 400 }
      );
    }

    // Validate line items
    for (const item of lineItems) {
      if (typeof item.amount !== 'number' || item.amount < 0) {
        return NextResponse.json({ error: 'Line item amounts must be non-negative numbers' }, { status: 400 });
      }
    }
    const taxAmount = typeof tax === 'number' && tax >= 0 ? tax : 0;

    // Calculate totals
    const subtotal = lineItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    const total = subtotal + taxAmount;

    // Generate invoice number (format: INV-YYYYMMDD-XXXX)
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${randomPart}`;

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueInDays);

    // If bookingId is provided, check if booking already has an invoice
    if (bookingId) {
      const existingInvoice = await prisma.invoice.findFirst({
        where: { bookingId },
      });

      if (existingInvoice) {
        return NextResponse.json(
          { error: 'Booking already has an invoice' },
          { status: 400 }
        );
      }
    }

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const invoice = await prisma.invoice.create({
      data: {
        companyId: user.companyId,
        userId: session.user.id,
        clientId,
        bookingId: bookingId || null,
        invoiceNumber,
        dueDate,
        lineItems,
        subtotal,
        tax: taxAmount,
        total,
        notes: notes || null,
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
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
