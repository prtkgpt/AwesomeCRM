import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Validation schema for creating inventory transactions
const createTransactionSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  type: z.enum(['PURCHASE', 'USAGE', 'RESTOCK', 'ADJUSTMENT', 'TRANSFER', 'WASTE']),
  quantity: z.number().refine(val => val !== 0, 'Quantity cannot be zero'),

  // Reference (optional)
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),

  // Cost (optional, mainly for PURCHASE/RESTOCK)
  unitCost: z.number().min(0).optional(),

  notes: z.string().optional(),
});

// Validation schema for query params
const queryParamsSchema = z.object({
  itemId: z.string().optional(),
  type: z.enum(['PURCHASE', 'USAGE', 'RESTOCK', 'ADJUSTMENT', 'TRANSFER', 'WASTE']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// GET /api/inventory/transactions - List stock movements
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can view inventory transactions
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = queryParamsSchema.parse({
      itemId: searchParams.get('itemId') || undefined,
      type: searchParams.get('type') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
    });

    const { itemId, type, startDate, endDate, page, limit } = queryParams;
    const skip = (page - 1) * limit;

    // Build where clause - need to filter by company through the item
    const where: any = {
      item: {
        companyId: user.companyId,
      },
    };

    if (itemId) {
      where.itemId = itemId;
    }

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Fetch transactions with pagination
    const [transactions, totalCount] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        include: {
          item: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true,
              category: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.inventoryMovement.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    // Get summary statistics for the filtered period
    const summaryWhere = { ...where };

    const [purchaseSum, usageSum, wasteSum] = await Promise.all([
      prisma.inventoryMovement.aggregate({
        where: { ...summaryWhere, type: 'PURCHASE' },
        _sum: { quantity: true, totalCost: true },
      }),
      prisma.inventoryMovement.aggregate({
        where: { ...summaryWhere, type: 'USAGE' },
        _sum: { quantity: true },
      }),
      prisma.inventoryMovement.aggregate({
        where: { ...summaryWhere, type: 'WASTE' },
        _sum: { quantity: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      summary: {
        totalPurchased: purchaseSum._sum.quantity || 0,
        totalPurchaseCost: purchaseSum._sum.totalCost || 0,
        totalUsed: Math.abs(usageSum._sum.quantity || 0),
        totalWasted: Math.abs(wasteSum._sum.quantity || 0),
      },
    });
  } catch (error) {
    console.error('GET /api/inventory/transactions error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory transactions' },
      { status: 500 }
    );
  }
}

// POST /api/inventory/transactions - Record stock in/out
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can create inventory transactions
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createTransactionSchema.parse(body);

    // Verify the inventory item exists and belongs to the company
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        id: validatedData.itemId,
        companyId: user.companyId,
      },
    });

    if (!inventoryItem) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // Determine the quantity change based on type
    // PURCHASE, RESTOCK, ADJUSTMENT (positive) add to stock
    // USAGE, WASTE, TRANSFER subtract from stock (should be negative in input or we negate it)
    let quantityChange = validatedData.quantity;

    // For outgoing movements, ensure quantity is negative
    if (['USAGE', 'WASTE', 'TRANSFER'].includes(validatedData.type)) {
      quantityChange = -Math.abs(validatedData.quantity);
    }

    // For incoming movements, ensure quantity is positive
    if (['PURCHASE', 'RESTOCK'].includes(validatedData.type)) {
      quantityChange = Math.abs(validatedData.quantity);
    }

    // For ADJUSTMENT, quantity can be positive or negative as provided

    const previousQuantity = inventoryItem.quantity;
    const newQuantity = previousQuantity + quantityChange;

    // Check if we have enough stock for outgoing movements
    if (newQuantity < 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient stock. Current quantity: ${previousQuantity}, requested: ${Math.abs(quantityChange)}`
        },
        { status: 400 }
      );
    }

    // Calculate cost
    const unitCost = validatedData.unitCost || inventoryItem.unitCost;
    const totalCost = unitCost ? Math.abs(quantityChange) * unitCost : null;

    // Create the transaction and update item quantity in a transaction
    const [transaction, updatedItem] = await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: {
          itemId: validatedData.itemId,
          type: validatedData.type,
          quantity: quantityChange,
          previousQuantity,
          newQuantity,
          unitCost,
          totalCost,
          referenceType: validatedData.referenceType,
          referenceId: validatedData.referenceId,
          notes: validatedData.notes,
          recordedById: session.user.id,
        },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true,
            },
          },
        },
      }),
      prisma.inventoryItem.update({
        where: { id: validatedData.itemId },
        data: {
          quantity: newQuantity,
          // Update total value
          totalValue: inventoryItem.unitCost ? newQuantity * inventoryItem.unitCost : null,
          // If this is a purchase/restock with unit cost, update the item's unit cost
          ...(validatedData.unitCost && ['PURCHASE', 'RESTOCK'].includes(validatedData.type) && {
            unitCost: validatedData.unitCost,
          }),
        },
      }),
    ]);

    // Check if item is now low on stock
    const isLowStock = updatedItem.reorderLevel !== null
      && updatedItem.quantity <= updatedItem.reorderLevel;

    return NextResponse.json({
      success: true,
      data: transaction,
      updatedItem: {
        id: updatedItem.id,
        name: updatedItem.name,
        quantity: updatedItem.quantity,
        isLowStock,
      },
      message: 'Stock transaction recorded successfully',
      ...(isLowStock && {
        warning: `Low stock alert: ${updatedItem.name} is at or below reorder level (${updatedItem.reorderLevel})`,
      }),
    });
  } catch (error) {
    console.error('POST /api/inventory/transactions error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to record stock transaction' },
      { status: 500 }
    );
  }
}
