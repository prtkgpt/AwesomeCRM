import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Validation schema for updating inventory items
const updateInventoryItemSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  sku: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),

  // Stock
  unit: z.string().optional(),
  reorderLevel: z.number().min(0).optional().nullable(),
  reorderQuantity: z.number().min(0).optional().nullable(),

  // Cost
  unitCost: z.number().min(0).optional().nullable(),

  // Vendor
  vendorName: z.string().optional().nullable(),
  vendorSku: z.string().optional().nullable(),
  vendorUrl: z.string().url().optional().or(z.literal('')).nullable(),

  isActive: z.boolean().optional(),
});

// GET /api/inventory/[id] - Get inventory item details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            street: true,
            city: true,
            state: true,
          },
        },
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            type: true,
            quantity: true,
            previousQuantity: true,
            newQuantity: true,
            unitCost: true,
            totalCost: true,
            referenceType: true,
            referenceId: true,
            notes: true,
            recordedById: true,
            createdAt: true,
          },
        },
      },
    });

    if (!inventoryItem) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // Check if item is low on stock
    const isLowStock = inventoryItem.reorderLevel !== null
      && inventoryItem.quantity <= inventoryItem.reorderLevel;

    return NextResponse.json({
      success: true,
      data: {
        ...inventoryItem,
        isLowStock,
      },
    });
  } catch (error) {
    console.error('GET /api/inventory/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory item' },
      { status: 500 }
    );
  }
}

// PATCH /api/inventory/[id] - Update inventory item
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only OWNER and ADMIN can update inventory
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the inventory item exists and belongs to the company
    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateInventoryItemSchema.parse(body);

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

    // Check for duplicate SKU within the company (if changing SKU)
    if (validatedData.sku && validatedData.sku !== existingItem.sku) {
      const existingSku = await prisma.inventoryItem.findFirst({
        where: {
          companyId: user.companyId,
          sku: validatedData.sku,
          id: { not: params.id },
        },
      });

      if (existingSku) {
        return NextResponse.json(
          { success: false, error: 'An item with this SKU already exists' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: any = {};

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }
    if (validatedData.sku !== undefined) {
      updateData.sku = validatedData.sku;
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }
    if (validatedData.category !== undefined) {
      updateData.category = validatedData.category;
    }
    if (validatedData.locationId !== undefined) {
      updateData.locationId = validatedData.locationId;
    }
    if (validatedData.unit !== undefined) {
      updateData.unit = validatedData.unit;
    }
    if (validatedData.reorderLevel !== undefined) {
      updateData.reorderLevel = validatedData.reorderLevel;
    }
    if (validatedData.reorderQuantity !== undefined) {
      updateData.reorderQuantity = validatedData.reorderQuantity;
    }
    if (validatedData.unitCost !== undefined) {
      updateData.unitCost = validatedData.unitCost;
      // Recalculate total value
      updateData.totalValue = validatedData.unitCost !== null
        ? existingItem.quantity * validatedData.unitCost
        : null;
    }
    if (validatedData.vendorName !== undefined) {
      updateData.vendorName = validatedData.vendorName;
    }
    if (validatedData.vendorSku !== undefined) {
      updateData.vendorSku = validatedData.vendorSku;
    }
    if (validatedData.vendorUrl !== undefined) {
      updateData.vendorUrl = validatedData.vendorUrl || null;
    }
    if (validatedData.isActive !== undefined) {
      updateData.isActive = validatedData.isActive;
    }

    // Update the inventory item
    const inventoryItem = await prisma.inventoryItem.update({
      where: { id: params.id },
      data: updateData,
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: inventoryItem,
      message: 'Inventory item updated successfully',
    });
  } catch (error) {
    console.error('PATCH /api/inventory/[id] error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update inventory item' },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory/[id] - Delete inventory item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only OWNER and ADMIN can delete inventory
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the inventory item exists and belongs to the company
    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
      include: {
        _count: {
          select: { movements: true },
        },
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // Check if there are movements - if so, soft delete instead
    if (existingItem._count.movements > 0) {
      // Soft delete by marking as inactive
      await prisma.inventoryItem.update({
        where: { id: params.id },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        message: 'Inventory item deactivated (has transaction history)',
        softDelete: true,
      });
    }

    // Hard delete if no movements
    await prisma.inventoryItem.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Inventory item deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/inventory/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete inventory item' },
      { status: 500 }
    );
  }
}
