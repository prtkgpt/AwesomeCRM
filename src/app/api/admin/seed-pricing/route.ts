import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/admin/seed-pricing - Seed pricing configuration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true },
    });

    if (!user || !user.companyId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER can seed pricing
    if (user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden - only owners can seed pricing' }, { status: 403 });
    }

    // Delete existing pricing rules for this company
    await prisma.pricingRule.deleteMany({
      where: { companyId: user.companyId },
    });

    // TODO: Uncomment after migration is applied
    // Update company with hourly rate and service type multipliers
    // await prisma.company.update({
    //   where: { id: user.companyId },
    //   data: {
    //     hourlyRate: 50.00,
    //     serviceTypeMultipliers: {
    //       STANDARD: 1.0,           // Initial Standard - 100%
    //       DEEP: 1.2,              // Initial Deep cleaning - 120%
    //       MOVE_OUT: 1.2,          // Move in/Move out - 120%
    //       WEEKLY: 0.75,           // Recurring weekly - 75%
    //       BIWEEKLY: 0.85,         // Recurring Bi-weekly - 85%
    //       MONTHLY: 0.9,           // Recurring monthly - 90%
    //       POST_CONSTRUCTION: 1.3, // Post Construction - 130%
    //       POST_PARTY: 1.1,        // Deep Cleaning/Post Party - 110%
    //     },
    //   },
    // });

    const pricingRules = [];

    // ============================================
    // SERVICE AREAS (Room Types)
    // ============================================
    const serviceAreas = [
      { name: 'Bedroom', duration: 30, price: 25.00, sortOrder: 1 },
      { name: 'Full Bathroom', duration: 40, price: 33.33, sortOrder: 2 },
      { name: 'Half Bathroom', duration: 20, price: 16.67, sortOrder: 3 },
      { name: 'Kitchen', duration: 45, price: 37.50, sortOrder: 4 },
      { name: 'Living Area', duration: 45, price: 37.50, sortOrder: 5 },
      { name: 'Dining Room', duration: 15, price: 12.50, sortOrder: 6 },
      { name: 'Office', duration: 20, price: 16.67, sortOrder: 7 },
      { name: 'Den', duration: 30, price: 25.00, sortOrder: 8 },
      { name: 'Laundry', duration: 40, price: 33.33, sortOrder: 9 },
      { name: 'Pantry', duration: 20, price: 16.67, sortOrder: 10 },
    ];

    for (const area of serviceAreas) {
      const type = area.name.toLowerCase().includes('bedroom') ? 'BEDROOM' :
                   area.name.toLowerCase().includes('bathroom') ? 'BATHROOM' :
                   'CUSTOM';
      pricingRules.push({
        companyId: user.companyId,
        type: type as any,
        name: area.name,
        price: area.price,
        duration: area.duration,
        display: 'BOTH' as any,
        sortOrder: area.sortOrder,
        isActive: true,
      });
    }

    // ============================================
    // ADD-ONS
    // ============================================
    const addons = [
      { name: 'Oven', duration: 45, sortOrder: 1 },
      { name: 'Fridge', duration: 30, sortOrder: 2 },
      { name: 'Light Fixtures', duration: 30, sortOrder: 3 },
      { name: 'Cabinets', duration: 30, sortOrder: 4 },
      { name: 'Spot wall cleaning', duration: 30, sortOrder: 5 },
      { name: 'Baseboards', duration: 60, sortOrder: 6 },
      { name: 'Trash Disposal', duration: 30, sortOrder: 7 },
      { name: 'Linen', duration: 15, sortOrder: 8 },
      { name: 'Interior Window Cleaning', duration: 10, sortOrder: 9 },
    ];

    // Calculate price based on $50/hour rate
    for (const addon of addons) {
      const price = (addon.duration / 60) * 50;
      pricingRules.push({
        companyId: user.companyId,
        type: 'ADDON' as any,
        name: addon.name,
        price: parseFloat(price.toFixed(2)),
        duration: addon.duration,
        display: 'BOTH' as any,
        sortOrder: addon.sortOrder,
        isActive: true,
      });
    }

    // Create all pricing rules
    const created = await prisma.pricingRule.createMany({
      data: pricingRules,
    });

    console.log(`✅ Seeded ${created.count} pricing rules for company ${user.companyId}`);

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${created.count} pricing rules`,
      data: {
        count: created.count,
        serviceAreas: serviceAreas.length,
        addons: addons.length,
      },
    });
  } catch (error) {
    console.error('🔴 POST /api/admin/seed-pricing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed pricing' },
      { status: 500 }
    );
  }
}
