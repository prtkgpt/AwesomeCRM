import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createPayLogSchema = z.object({
  type: z.enum(['PAYCHECK', 'SUPPLIES_REIMBURSEMENT', 'GAS_REIMBURSEMENT']),
  amount: z.number().min(0, 'Amount must be positive'),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  description: z.string().optional(),
  notes: z.string().optional(),

  // Paycheck specific fields
  hoursWorked: z.number().optional(),
  hourlyRate: z.number().optional(),
  periodStart: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
  periodEnd: z.string().or(z.date()).transform((val) => new Date(val)).optional(),

  // Reimbursement specific fields
  receiptUrl: z.string().optional(),
});

// GET /api/team/[id]/pay-logs - Get pay logs for a team member
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER can view pay logs
    if (user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only the owner can view pay logs' },
        { status: 403 }
      );
    }

    // Verify team member belongs to same company
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    // Get pay logs
    const payLogs = await prisma.payLog.findMany({
      where: {
        teamMemberId: params.id,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: payLogs,
    });
  } catch (error) {
    console.error('GET /api/team/[id]/pay-logs error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pay logs' },
      { status: 500 }
    );
  }
}

// POST /api/team/[id]/pay-logs - Create a new pay log entry
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER can create pay logs
    if (user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only the owner can create pay logs' },
        { status: 403 }
      );
    }

    // Verify team member belongs to same company
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = createPayLogSchema.parse(body);

    // Create pay log
    const payLog = await prisma.payLog.create({
      data: {
        companyId: user.companyId,
        teamMemberId: params.id,
        type: validatedData.type,
        amount: validatedData.amount,
        date: validatedData.date,
        description: validatedData.description,
        notes: validatedData.notes,
        hoursWorked: validatedData.hoursWorked,
        hourlyRate: validatedData.hourlyRate,
        periodStart: validatedData.periodStart,
        periodEnd: validatedData.periodEnd,
        receiptUrl: validatedData.receiptUrl,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: payLog,
      message: 'Pay log created successfully',
    });
  } catch (error: any) {
    console.error('POST /api/team/[id]/pay-logs error:', error);

    if (error.name === 'ZodError') {
      const zodError = error as z.ZodError;
      const fieldErrors = zodError.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return NextResponse.json(
        { success: false, error: fieldErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create pay log' },
      { status: 500 }
    );
  }
}
