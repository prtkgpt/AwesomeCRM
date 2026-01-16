import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/company/operations
 * Fetch operational expenses for the company (Owner only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role and company
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user || user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Forbidden - Owner only' },
        { status: 403 }
      );
    }

    if (!user.companyId) {
      return NextResponse.json(
        { error: 'No company associated with user' },
        { status: 400 }
      );
    }

    // Fetch company operational expenses
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        insuranceCost: true,
        bondCost: true,
        workersCompCost: true,
        cleaningSuppliesCost: true,
        gasReimbursementRate: true,
        vaAdminSalary: true,
        ownerSalary: true,
        otherExpenses: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        insuranceCost: company.insuranceCost || 0,
        bondCost: company.bondCost || 0,
        workersCompCost: company.workersCompCost || 0,
        cleaningSuppliesCost: company.cleaningSuppliesCost || 0,
        gasReimbursementRate: company.gasReimbursementRate || 0,
        vaAdminSalary: company.vaAdminSalary || 0,
        ownerSalary: company.ownerSalary || 0,
        otherExpenses: company.otherExpenses || 0,
      },
    });
  } catch (error) {
    console.error('Failed to fetch operational expenses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch operational expenses' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/company/operations
 * Update operational expenses for the company (Owner only)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role and company
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user || user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Forbidden - Owner only' },
        { status: 403 }
      );
    }

    if (!user.companyId) {
      return NextResponse.json(
        { error: 'No company associated with user' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate that all values are numbers and non-negative
    const expenses = {
      insuranceCost: parseFloat(body.insuranceCost) || 0,
      bondCost: parseFloat(body.bondCost) || 0,
      workersCompCost: parseFloat(body.workersCompCost) || 0,
      cleaningSuppliesCost: parseFloat(body.cleaningSuppliesCost) || 0,
      gasReimbursementRate: parseFloat(body.gasReimbursementRate) || 0,
      vaAdminSalary: parseFloat(body.vaAdminSalary) || 0,
      ownerSalary: parseFloat(body.ownerSalary) || 0,
      otherExpenses: parseFloat(body.otherExpenses) || 0,
    };

    // Check for negative values
    const hasNegative = Object.values(expenses).some((val) => val < 0);
    if (hasNegative) {
      return NextResponse.json(
        { success: false, error: 'Expenses cannot be negative' },
        { status: 400 }
      );
    }

    // Update company operational expenses
    const updatedCompany = await prisma.company.update({
      where: { id: user.companyId },
      data: expenses,
      select: {
        insuranceCost: true,
        bondCost: true,
        workersCompCost: true,
        cleaningSuppliesCost: true,
        gasReimbursementRate: true,
        vaAdminSalary: true,
        ownerSalary: true,
        otherExpenses: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Operational expenses updated successfully',
      data: updatedCompany,
    });
  } catch (error) {
    console.error('Failed to update operational expenses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update operational expenses' },
      { status: 500 }
    );
  }
}
