import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { renderToStream } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/invoice-pdf';

// GET /api/invoices/[id]/pdf - Download invoice as PDF
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the invoice with all necessary data
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

    // Convert the invoice data to the format expected by InvoicePDF
    const invoiceData = {
      ...invoice,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      lineItems: invoice.lineItems as any[],
    };

    // Generate PDF stream
    const stream = await renderToStream(<InvoicePDF invoice={invoiceData} />);

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as any) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Return PDF with proper headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
