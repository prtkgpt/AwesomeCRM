import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/invoices/[id] - Get a specific invoice
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
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
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            businessName: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

// PATCH /api/invoices/[id] - Update an invoice
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, lineItems, tax, notes, terms, sentTo } = body;

    // Verify ownership
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Calculate new totals if line items changed
    let updateData: any = {};

    if (lineItems) {
      const subtotal = lineItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
      const taxAmount = tax !== undefined ? tax : existingInvoice.tax;
      updateData.lineItems = lineItems;
      updateData.subtotal = subtotal;
      updateData.tax = taxAmount;
      updateData.total = subtotal + taxAmount;
    }

    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (terms !== undefined) updateData.terms = terms;

    // If status is changing to SENT, record sent date
    if (status === 'SENT' && existingInvoice.status !== 'SENT') {
      updateData.sentAt = new Date();
      if (sentTo) updateData.sentTo = sentTo;
    }

    // If status is changing to PAID
    if (status === 'PAID' && existingInvoice.status !== 'PAID' && existingInvoice.bookingId) {
      // Mark the associated booking as paid
      await prisma.booking.update({
        where: { id: existingInvoice.bookingId },
        data: {
          isPaid: true,
          paidAt: new Date(),
        },
      });
    }

    const invoice = await prisma.invoice.update({
      where: { id: params.id },
      data: updateData,
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
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

// DELETE /api/invoices/[id] - Delete an invoice
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Don't allow deletion of paid invoices
    if (invoice.status === 'PAID') {
      return NextResponse.json(
        { error: 'Cannot delete paid invoices' },
        { status: 400 }
      );
    }

    await prisma.invoice.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Invoice deleted' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
