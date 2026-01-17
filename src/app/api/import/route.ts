import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Helper function to parse CSV
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length !== headers.length) {
      continue; // Skip malformed rows
    }

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    rows.push(row);
  }

  return rows;
}

// POST /api/import - Import CSV data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is OWNER or ADMIN
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only owners and admins can import data' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: 'No file provided',
          imported: 0,
          failed: 0
        },
        { status: 400 }
      );
    }

    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          message: 'File size exceeds 5MB limit',
          imported: 0,
          failed: 0
        },
        { status: 400 }
      );
    }

    // Read file content
    const csvText = await file.text();
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No data found in CSV file',
        imported: 0,
        failed: 0,
      });
    }

    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    if (type === 'clients') {
      // Import clients
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          // Validate required fields
          if (!row.name || !row.phone || !row.street || !row.city || !row.state || !row.zip) {
            errors.push(`Row ${i + 2}: Missing required fields (name, phone, street, city, state, zip)`);
            failed++;
            continue;
          }

          // Check if client with this email already exists (if email provided)
          if (row.email) {
            const existing = await prisma.client.findFirst({
              where: {
                companyId: user.companyId,
                email: row.email,
              },
            });

            if (existing) {
              errors.push(`Row ${i + 2}: Client with email ${row.email} already exists`);
              failed++;
              continue;
            }
          }

          // Parse insurance fields
          const hasInsurance = row.hasInsurance?.toLowerCase() === 'true';
          const copayAmount = row.copayAmount ? parseFloat(row.copayAmount) : null;

          // Create client with address
          await prisma.client.create({
            data: {
              companyId: user.companyId,
              userId: session.user.id,
              name: row.name,
              email: row.email || null,
              phone: row.phone,
              hasInsurance,
              insuranceProvider: hasInsurance ? row.insuranceProvider || null : null,
              standardCopayAmount: copayAmount,
              // cleaningObservations: row.cleaningObservations || null, // TODO: Re-enable after migration
              addresses: {
                create: {
                  label: 'Primary Address',
                  street: row.street,
                  city: row.city,
                  state: row.state,
                  zip: row.zip,
                },
              },
            },
          });

          imported++;
        } catch (error: any) {
          errors.push(`Row ${i + 2}: ${error.message || 'Unknown error'}`);
          failed++;
        }
      }
    } else if (type === 'bookings') {
      // Import bookings
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          // Validate required fields
          if (!row.clientEmail || !row.date || !row.serviceType || !row.status || !row.price) {
            errors.push(`Row ${i + 2}: Missing required fields (clientEmail, date, serviceType, status, price)`);
            failed++;
            continue;
          }

          // Find client by email
          const client = await prisma.client.findFirst({
            where: {
              companyId: user.companyId,
              email: row.clientEmail,
            },
            include: {
              addresses: true,
            },
          });

          if (!client) {
            errors.push(`Row ${i + 2}: Client with email ${row.clientEmail} not found`);
            failed++;
            continue;
          }

          if (!client.addresses || client.addresses.length === 0) {
            errors.push(`Row ${i + 2}: Client ${row.clientEmail} has no address`);
            failed++;
            continue;
          }

          // Validate and map service type
          const serviceTypeMap: Record<string, string> = {
            'STANDARD': 'STANDARD',
            'DEEP': 'DEEP',
            'MOVE_OUT': 'MOVE_OUT',
            'REGULAR CLEANING': 'STANDARD',
            'DEEP CLEANING': 'DEEP',
            'MOVE-OUT': 'MOVE_OUT',
            'MOVEOUT': 'MOVE_OUT',
          };

          const normalizedServiceType = row.serviceType.toUpperCase().trim();
          const validServiceType = serviceTypeMap[normalizedServiceType];

          if (!validServiceType) {
            errors.push(`Row ${i + 2}: Invalid service type '${row.serviceType}'. Must be one of: STANDARD, DEEP, MOVE_OUT`);
            failed++;
            continue;
          }

          // Validate status - must match BookingStatus enum in schema
          const validStatuses = ['SCHEDULED', 'CLEANER_COMPLETED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
          const statusUpper = row.status.toUpperCase();
          // Map common alternative names to valid statuses
          const statusMap: Record<string, string> = {
            'IN_PROGRESS': 'SCHEDULED',
            'PENDING': 'SCHEDULED',
            'DONE': 'COMPLETED',
          };
          const mappedStatus = statusMap[statusUpper] || statusUpper;
          if (!validStatuses.includes(mappedStatus)) {
            errors.push(`Row ${i + 2}: Invalid status '${row.status}'. Must be one of: ${validStatuses.join(', ')}`);
            failed++;
            continue;
          }

          // Parse date
          const scheduledDate = new Date(row.date);
          if (isNaN(scheduledDate.getTime())) {
            errors.push(`Row ${i + 2}: Invalid date format '${row.date}'. Use YYYY-MM-DD`);
            failed++;
            continue;
          }

          // Parse price
          const price = parseFloat(row.price);
          if (isNaN(price)) {
            errors.push(`Row ${i + 2}: Invalid price '${row.price}'`);
            failed++;
            continue;
          }

          // Create booking
          await prisma.booking.create({
            data: {
              companyId: user.companyId,
              clientId: client.id,
              addressId: client.addresses[0].id,
              scheduledDate,
              duration: 120, // Default 2 hours
              status: mappedStatus as any,
              serviceType: validServiceType as any,
              price,
              userId: session.user.id,
            },
          });

          imported++;
        } catch (error: any) {
          errors.push(`Row ${i + 2}: ${error.message || 'Unknown error'}`);
          failed++;
        }
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid import type',
          imported: 0,
          failed: 0,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: imported > 0,
      message: imported > 0
        ? `Successfully imported ${imported} ${type}`
        : `Failed to import any ${type}`,
      imported,
      failed,
      errors: errors.slice(0, 50), // Limit to first 50 errors
    });
  } catch (error) {
    console.error('POST /api/import error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to process import',
        imported: 0,
        failed: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
