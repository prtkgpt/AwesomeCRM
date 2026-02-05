import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.enum(['TRANSACTIONAL', 'MARKETING', 'AUTOMATED']),
  subject: z.string().min(1, 'Subject is required'),
  htmlContent: z.string().min(1, 'HTML content is required'),
  textContent: z.string().optional(),
  variables: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// GET: List all email templates for the company
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const templates = await prisma.emailTemplate.findMany({
      where: {
        companyId: user.companyId,
        ...(category && { category }),
        ...(activeOnly && { isActive: true }),
      },
      orderBy: [
        { isDefault: 'desc' },
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    console.error('List email templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new email template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createTemplateSchema.parse(body);

    // Extract variables from the content ({{variableName}})
    const extractVariables = (content: string): string[] => {
      const matches = content.match(/\{\{(\w+)\}\}/g) || [];
      return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
    };

    const htmlVariables = extractVariables(validatedData.htmlContent);
    const subjectVariables = extractVariables(validatedData.subject);
    const allVariables = [...new Set([...htmlVariables, ...subjectVariables])];

    const template = await prisma.emailTemplate.create({
      data: {
        companyId: user.companyId,
        name: validatedData.name,
        category: validatedData.category,
        subject: validatedData.subject,
        htmlContent: validatedData.htmlContent,
        textContent: validatedData.textContent,
        variables: validatedData.variables || allVariables,
        isDefault: validatedData.isDefault || false,
        isActive: validatedData.isActive ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      data: template,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Create email template error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
