import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST: Preview an email template with sample data
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
      include: {
        company: {
          select: { name: true, logo: true, primaryColor: true, phone: true, email: true },
        },
      },
    });

    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const template = await prisma.emailTemplate.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const body = await request.json();
    const sampleData = body.sampleData || {};

    // Default sample data
    const defaultSampleData: Record<string, string> = {
      clientName: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '(555) 123-4567',
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: '10:00 AM',
      address: '123 Main St, Anytown, ST 12345',
      serviceType: 'Standard Cleaning',
      price: '$150.00',
      duration: '2 hours',
      cleanerName: 'Jane Smith',
      referralCode: 'JOHND123',
      referralCredits: '$25.00',
      invoiceNumber: 'INV-001234',
      invoiceTotal: '$175.00',
      paymentLink: 'https://example.com/pay/abc123',
      bookingLink: 'https://example.com/book',
      unsubscribeLink: 'https://example.com/unsubscribe',
      businessName: (user as any).company?.name || 'Your Cleaning Company',
      businessPhone: (user as any).company?.phone || '(555) 000-0000',
      businessEmail: (user as any).company?.email || 'info@example.com',
      businessLogo: (user as any).company?.logo || '',
      year: new Date().getFullYear().toString(),
    };

    // Merge with provided sample data
    const mergedData = { ...defaultSampleData, ...sampleData };

    // Replace variables in content
    const replaceVariables = (content: string, data: Record<string, string>): string => {
      let result = content;
      Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(regex, value);
      });
      return result;
    };

    const previewSubject = replaceVariables(template.subject, mergedData);
    const previewHtml = replaceVariables(template.htmlContent, mergedData);
    const previewText = template.textContent
      ? replaceVariables(template.textContent, mergedData)
      : null;

    // Identify any remaining unresolved variables
    const unresolvedInSubject = previewSubject.match(/\{\{(\w+)\}\}/g) || [];
    const unresolvedInHtml = previewHtml.match(/\{\{(\w+)\}\}/g) || [];
    const unresolvedVariables = [...new Set([...unresolvedInSubject, ...unresolvedInHtml])];

    return NextResponse.json({
      success: true,
      data: {
        subject: previewSubject,
        htmlContent: previewHtml,
        textContent: previewText,
        variables: template.variables,
        sampleDataUsed: mergedData,
        unresolvedVariables,
      },
    });
  } catch (error) {
    console.error('Preview email template error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
