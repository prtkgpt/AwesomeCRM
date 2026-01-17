import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Validation schema for creating inventory items
const createInventoryItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  locationId: z.string().optional(),

  // Stock
  quantity: z.number().min(0, 'Quantity must be non-negative').default(0),
  unit: z.string().default('each'),
  reorderLevel: z.number().min(0).optional(),
  reorderQuantity: z.number().min(0).optional(),

  // Cost
  unitCost: z.number().min(0).optional(),

  // Vendor
  vendorName: z.string().optional(),
  vendorSku: z.string().optional(),
  vendorUrl: z.string().url().optional().or(z.literal('')),

  isActive: z.boolean().default(true),
});

// Validation schema for query params
const queryParamsSchema = z.object({
  category: z.string().optional(),
  locationId: z.string().optional(),
  lowStock: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// GET /api/inventory - List inventory items with filters
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

    // Only OWNER and ADMIN can view inventory
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = queryParamsSchema.parse({
      category: searchParams.get('category') || undefined,
      locationId: searchParams.get('locationId') || undefined,
      lowStock: searchParams.get('lowStock') || undefined,
      search: searchParams.get('search') || undefined,
      isActive: searchParams.get('isActive') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
    });

    const { category, locationId, lowStock, search, isActive, page, limit } = queryParams;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      companyId: user.companyId,
    };

    if (category) {
      where.category = category;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { vendorName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // For low stock filter, we need to filter items where quantity <= reorderLevel
    // This requires a raw query or post-filtering
    let inventoryItems;
    let totalCount;

    if (lowStock === 'true') {
      // Get all items and filter in-memory for low stock
      const allItems = await prisma.inventoryItem.findMany({
        where,
        include: {
          location: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: { movements: true },
          },
        },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' },
        ],
      });

      // Filter for low stock items (quantity <= reorderLevel)
      const lowStockItems = allItems.filter(
        item => item.reorderLevel !== null && item.quantity <= item.reorderLevel
      );

      totalCount = lowStockItems.length;
      inventoryItems = lowStockItems.slice(skip, skip + limit);
    } else {
      [inventoryItems, totalCount] = await Promise.all([
        prisma.inventoryItem.findMany({
          where,
          include: {
            location: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: { movements: true },
            },
          },
          orderBy: [
            { category: 'asc' },
            { name: 'asc' },
          ],
          skip,
          take: limit,
        }),
        prisma.inventoryItem.count({ where }),
      ]);
    }

    const totalPages = Math.ceil(totalCount / limit);

    // Get category summary
    const categories = await prisma.inventoryItem.groupBy({
      by: ['category'],
      where: { companyId: user.companyId, isActive: true },
      _count: { _all: true },
      _sum: { quantity: true },
    });

    // Get low stock count
    const allItemsForLowStock = await prisma.inventoryItem.findMany({
      where: { companyId: user.companyId, isActive: true },
      select: { quantity: true, reorderLevel: true },
    });
    const lowStockCount = allItemsForLowStock.filter(
      item => item.reorderLevel !== null && item.quantity <= item.reorderLevel
    ).length;

    return NextResponse.json({
      success: true,
      data: inventoryItems,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      summary: {
        categories: categories.map(c => ({
          category: c.category || 'Uncategorized',
          count: c._count._all,
          totalQuantity: c._sum.quantity || 0,
        })),
        lowStockCount,
        totalItems: totalCount,
      },
    });
  } catch (error) {
    console.error('GET /api/inventory error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory items' },
      { status: 500 }
    );
  }
}

// POST /api/inventory - Create new inventory item
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

    // Only OWNER and ADMIN can create inventory items
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createInventoryItemSchema.parse(body);

    // If locationId is provided, verify it exists and belongs to the company
    if (validatedData.locationId) {
      const location = await prisma.location.findFirst({
        where: {
          id: validatedData.locationId,
          companyId: user.companyId,
        },
      });

      if (!location) {
        return NextResponse.json(
          { success: false, error: 'Location not found' },
          { status: 404 }
        );
      }
    }

    // Check for duplicate SKU within the company
    if (validatedData.sku) {
      const existingSku = await prisma.inventoryItem.findFirst({
        where: {
          companyId: user.companyId,
          sku: validatedData.sku,
        },
      });

      if (existingSku) {
        return NextResponse.json(
          { success: false, error: 'An item with this SKU already exists' },
          { status: 400 }
        );
      }
    }

    // Calculate total value
    const totalValue = validatedData.unitCost
      ? validatedData.quantity * validatedData.unitCost
      : null;

    // Create the inventory item
    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        companyId: user.companyId,
        locationId: validatedData.locationId,
        name: validatedData.name,
        sku: validatedData.sku,
        description: validatedData.description,
        category: validatedData.category,
        quantity: validatedData.quantity,
        unit: validatedData.unit,
        reorderLevel: validatedData.reorderLevel,
        reorderQuantity: validatedData.reorderQuantity,
        unitCost: validatedData.unitCost,
        totalValue,
        vendorName: validatedData.vendorName,
        vendorSku: validatedData.vendorSku,
        vendorUrl: validatedData.vendorUrl || null,
        isActive: validatedData.isActive,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // If initial quantity > 0, create an initial stock movement
    if (validatedData.quantity > 0) {
      await prisma.inventoryMovement.create({
        data: {
          itemId: inventoryItem.id,
          type: 'PURCHASE',
          quantity: validatedData.quantity,
          previousQuantity: 0,
          newQuantity: validatedData.quantity,
          unitCost: validatedData.unitCost,
          totalCost: totalValue,
          notes: 'Initial stock',
          recordedById: session.user.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: inventoryItem,
      message: 'Inventory item created successfully',
    });
  } catch (error) {
    console.error('POST /api/inventory error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create inventory item' },
      { status: 500 }
    );
  }
}
