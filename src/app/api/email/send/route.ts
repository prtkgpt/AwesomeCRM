import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const sendEmailSchema = z.object({
  templateId: z.string().optional(),
  to: z.string().email('Valid email required'),
  recipientId: z.string().optional(),
  recipientType: z.enum(['CLIENT', 'USER']).optional(),
  subject: z.string().optional(),
  htmlContent: z.string().optional(),
  textContent: z.string().optional(),
  variables: z.record(z.string()).optional(),
});

// POST: Send an email using a template or custom content
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
      include: {
        company: {
          select: {
            name: true,
            email: true,
            phone: true,
            logo: true,
            resendApiKey: true,
          },
        },
      },
    });

    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = sendEmailSchema.parse(body);

    let subject: string;
    let htmlContent: string;
    let textContent: string | null = null;

    // If templateId provided, fetch and use template
    if (validatedData.templateId) {
      const template = await prisma.emailTemplate.findFirst({
        where: {
          id: validatedData.templateId,
          companyId: user.companyId,
          isActive: true,
        },
      });

      if (!template) {
        return NextResponse.json({ error: 'Template not found or inactive' }, { status: 404 });
      }

      subject = template.subject;
      htmlContent = template.htmlContent;
      textContent = template.textContent;
    } else {
      // Use custom content
      if (!validatedData.subject || !validatedData.htmlContent) {
        return NextResponse.json(
          { error: 'Subject and htmlContent required when not using template' },
          { status: 400 }
        );
      }
      subject = validatedData.subject;
      htmlContent = validatedData.htmlContent;
      textContent = validatedData.textContent || null;
    }

    // Replace variables in content
    const variables = validatedData.variables || {};
    const replaceVariables = (content: string): string => {
      let result = content;
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(regex, value);
      });
      // Add default company variables
      result = result.replace(/\{\{businessName\}\}/g, (user as any).company?.name || '');
      result = result.replace(/\{\{businessEmail\}\}/g, (user as any).company?.email || '');
      result = result.replace(/\{\{businessPhone\}\}/g, (user as any).company?.phone || '');
      result = result.replace(/\{\{businessLogo\}\}/g, (user as any).company?.logo || '');
      result = result.replace(/\{\{year\}\}/g, new Date().getFullYear().toString());
      return result;
    };

    const finalSubject = replaceVariables(subject);
    const finalHtml = replaceVariables(htmlContent);
    const finalText = textContent ? replaceVariables(textContent) : null;

    // Create email log entry first
    const emailLog = await prisma.emailLog.create({
      data: {
        companyId: user.companyId,
        templateId: validatedData.templateId || null,
        recipientId: validatedData.recipientId || null,
        recipientEmail: validatedData.to,
        recipientType: validatedData.recipientType || null,
        subject: finalSubject,
        status: 'QUEUED',
      },
    });

    // Send email using Resend
    const apiKey = (user as any).company?.resendApiKey || process.env.RESEND_API_KEY;

    if (!apiKey) {
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          errorMessage: 'No API key configured',
        },
      });
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: (user as any).company?.email || process.env.EMAIL_FROM || 'noreply@example.com',
          to: validatedData.to,
          subject: finalSubject,
          html: finalHtml,
          text: finalText || undefined,
        }),
      });

      const result = await response.json();

      if (response.ok && result.id) {
        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            providerId: result.id,
            providerStatus: 'sent',
          },
        });

        return NextResponse.json({
          success: true,
          data: {
            emailLogId: emailLog.id,
            providerId: result.id,
            status: 'SENT',
          },
        });
      } else {
        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            errorMessage: result.message || 'Unknown error',
          },
        });

        return NextResponse.json(
          { error: 'Failed to send email', details: result },
          { status: 500 }
        );
      }
    } catch (sendError) {
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          errorMessage: sendError instanceof Error ? sendError.message : 'Unknown error',
        },
      });
      throw sendError;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Send email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
