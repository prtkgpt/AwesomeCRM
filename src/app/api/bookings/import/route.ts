import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface ImportResult {
  success: number;
  failed: number;
  clientsCreated: number;
  errors: Array<{ row: number; error: string; data?: any }>;
}

// Field name mappings from various CRMs to our schema
const FIELD_MAPPINGS: Record<string, string> = {
  // Client name fields
  'full name': 'fullName',
  'fullname': 'fullName',
  'client name': 'fullName',
  'customer name': 'fullName',
  'name': 'fullName',
  'first name': 'firstName',
  'firstname': 'firstName',
  'last name': 'lastName',
  'lastname': 'lastName',

  // Contact fields
  'email': 'email',
  'email address': 'email',
  'e-mail': 'email',
  'phone': 'phone',
  'phone number': 'phone',
  'phonenumber': 'phone',
  'mobile': 'phone',
  'cell': 'phone',

  // Address fields
  'address': 'street',
  'street': 'street',
  'street address': 'street',
  'address line 1': 'street',
  'city': 'city',
  'state': 'state',
  'zip': 'zip',
  'zipcode': 'zip',
  'zip code': 'zip',
  'postal code': 'zip',
  'postalcode': 'zip',
  'zip/postal code': 'zip',

  // Booking date/time fields
  'date': 'date',
  'booking date': 'date',
  'appointment date': 'date',
  'scheduled date': 'date',
  'time': 'time',
  'booking time': 'time',
  'appointment time': 'time',
  'scheduled time': 'time',
  'booking start date time': 'startDateTime',
  'start date time': 'startDateTime',
  'booking end date time': 'endDateTime',
  'end date time': 'endDateTime',

  // Service fields
  'service': 'service',
  'service type': 'service',
  'service name': 'service',
  'duration': 'duration',

  // Payment fields
  'final amount': 'price',
  'amount': 'price',
  'total': 'price',
  'price': 'price',
  'service total': 'price',
  'amount paid by customer': 'amountPaid',
  'paid': 'isPaid',
  'payment method': 'paymentMethod',

  // Notes
  'booking note': 'notes',
  'note': 'notes',
  'notes': 'notes',
  'customer note': 'notes',
  'private customer note': 'internalNotes',
  'provider note': 'internalNotes',
  'key note': 'internalNotes',

  // Additional fields
  'parking': 'parkingInfo',
  'created on': 'createdOn',
};

function normalizeFieldName(fieldName: string): string {
  const normalized = fieldName.toLowerCase().trim();
  return FIELD_MAPPINGS[normalized] || fieldName;
}

function parseCSV(csvText: string): Array<Record<string, string>> {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => normalizeFieldName(h.trim().replace(/^"|"$/g, '')));
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      if (values[index]) {
        row[header] = values[index];
      }
    });

    if (Object.keys(row).length > 0) {
      rows.push(row);
    }
  }

  return rows;
}

function parseDateTime(dateStr: string, timeStr?: string): Date | null {
  try {
    // Try parsing ISO format first (from booking start/end date time)
    if (dateStr.includes('T') || dateStr.includes(' ')) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    // Try parsing date + time separately
    if (timeStr) {
      const combined = `${dateStr} ${timeStr}`;
      const parsed = new Date(combined);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    // Try parsing just date
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

function mapServiceType(service: string): 'STANDARD' | 'DEEP' | 'MOVE_OUT' {
  const normalized = service.toLowerCase();
  if (normalized.includes('deep')) return 'DEEP';
  if (normalized.includes('move') || normalized.includes('moving')) return 'MOVE_OUT';
  return 'STANDARD';
}

function convertStateName(state: string): string {
  if (state.length === 2) return state.toUpperCase();

  const stateMap: Record<string, string> = {
    'california': 'CA', 'new york': 'NY', 'texas': 'TX', 'florida': 'FL',
    'illinois': 'IL', 'pennsylvania': 'PA', 'ohio': 'OH', 'georgia': 'GA',
    'north carolina': 'NC', 'michigan': 'MI', 'new jersey': 'NJ', 'virginia': 'VA',
    'washington': 'WA', 'arizona': 'AZ', 'massachusetts': 'MA', 'tennessee': 'TN',
    'indiana': 'IN', 'missouri': 'MO', 'maryland': 'MD', 'wisconsin': 'WI',
    'colorado': 'CO', 'minnesota': 'MN', 'south carolina': 'SC', 'alabama': 'AL',
    'louisiana': 'LA', 'kentucky': 'KY', 'oregon': 'OR', 'oklahoma': 'OK',
    'connecticut': 'CT', 'iowa': 'IA', 'utah': 'UT', 'nevada': 'NV',
  };

  return stateMap[state.toLowerCase()] || state.substring(0, 2).toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is OWNER or ADMIN
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Only owners and admins can import bookings' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Read file content
    const csvText = await file.text();
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'CSV file is empty or invalid' },
        { status: 400 }
      );
    }

    const result: ImportResult = {
      success: 0,
      failed: 0,
      clientsCreated: 0,
      errors: [],
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2;
      const row = rows[i];

      try {
        // Extract client name
        let clientName = row.fullName || '';
        if (!clientName && (row.firstName || row.lastName)) {
          clientName = `${row.firstName || ''} ${row.lastName || ''}`.trim();
        }

        if (!clientName) {
          result.failed++;
          result.errors.push({
            row: rowNum,
            error: 'Client name is required',
            data: row,
          });
          continue;
        }

        // Extract contact info
        const email = row.email || null;
        const phone = row.phone ? row.phone.replace(/[\s\-\(\)\.]/g, '') : null;

        // Try to find existing client by email or phone
        let client = null;
        if (email || phone) {
          client = await prisma.client.findFirst({
            where: {
              companyId: user.companyId,
              OR: [
                email ? { email } : {},
                phone ? { phone } : {},
              ].filter(condition => Object.keys(condition).length > 0),
            },
            include: { addresses: true },
          });
        }

        // Create client if not found
        if (!client) {
          const hasAddress = row.street && row.city && row.state && row.zip;

          // Split clientName into firstName/lastName
          const nameParts = clientName.split(' ');
          const firstName = row.firstName || nameParts[0] || 'Unknown';
          const lastName = row.lastName || nameParts.slice(1).join(' ') || '';

          client = await prisma.client.create({
            data: {
              companyId: user.companyId,
              firstName,
              lastName,
              email,
              phone,
              addresses: hasAddress
                ? {
                    create: [
                      {
                        street: row.street,
                        city: row.city,
                        state: convertStateName(row.state),
                        zip: row.zip,
                        parkingInfo: row.parkingInfo,
                      },
                    ],
                  }
                : undefined,
            },
            include: { addresses: true },
          });

          result.clientsCreated++;
        }

        // Parse booking date/time
        let scheduledDate: Date | null = null;

        if (row.startDateTime) {
          scheduledDate = parseDateTime(row.startDateTime);
        } else if (row.date) {
          scheduledDate = parseDateTime(row.date, row.time);
        }

        if (!scheduledDate) {
          result.failed++;
          result.errors.push({
            row: rowNum,
            error: 'Valid booking date/time is required',
            data: row,
          });
          continue;
        }

        // Calculate duration
        let duration = 120; // Default 2 hours
        if (row.duration) {
          const parsedDuration = parseInt(row.duration);
          if (!isNaN(parsedDuration)) {
            duration = parsedDuration;
          }
        } else if (row.startDateTime && row.endDateTime) {
          const start = parseDateTime(row.startDateTime);
          const end = parseDateTime(row.endDateTime);
          if (start && end) {
            duration = Math.round((end.getTime() - start.getTime()) / 60000); // minutes
          }
        }

        // Parse service type
        const serviceType = row.service ? mapServiceType(row.service) : 'STANDARD';

        // Parse price
        let price = 80; // Default price
        if (row.price) {
          const parsedPrice = parseFloat(row.price.replace(/[$,]/g, ''));
          if (!isNaN(parsedPrice)) {
            price = parsedPrice;
          }
        }

        // Determine booking status (cancelled bookings from export)
        const status = row.type?.toLowerCase().includes('cancelled') ? 'CANCELLED' : 'CONFIRMED';

        // Get address ID (use first address or create with minimal info)
        let addressId = client.addresses[0]?.id;
        if (!addressId && row.street && row.city && row.state && row.zip) {
          const newAddress = await prisma.address.create({
            data: {
              clientId: client.id,
              street: row.street,
              city: row.city,
              state: convertStateName(row.state),
              zip: row.zip,
              parkingInfo: row.parkingInfo,
            },
          });
          addressId = newAddress.id;
        }

        if (!addressId) {
          result.failed++;
          result.errors.push({
            row: rowNum,
            error: 'Address is required for booking',
            data: row,
          });
          continue;
        }

        // Generate booking number
        const bookingNumber = `BK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        // Map payment method to enum or null
        const validPaymentMethods = ['CARD', 'CASH', 'CHECK', 'ZELLE', 'VENMO', 'CASHAPP', 'BANK_TRANSFER', 'GIFT_CARD', 'CREDITS', 'INSURANCE'];
        const paymentMethod = row.paymentMethod && validPaymentMethods.includes(row.paymentMethod.toUpperCase())
          ? row.paymentMethod.toUpperCase() as 'CARD' | 'CASH' | 'CHECK' | 'ZELLE' | 'VENMO' | 'CASHAPP' | 'BANK_TRANSFER' | 'GIFT_CARD' | 'CREDITS' | 'INSURANCE'
          : null;

        // Create booking
        await prisma.booking.create({
          data: {
            companyId: user.companyId,
            createdById: session.user.id,
            clientId: client.id,
            addressId,
            bookingNumber,
            scheduledDate,
            duration,
            serviceType,
            status,
            basePrice: price,
            subtotal: price,
            finalPrice: price,
            customerNotes: row.notes,
            internalNotes: row.internalNotes,
            isPaid: row.isPaid?.toLowerCase() === 'true' || row.amountPaid === row.price,
            paymentMethod,
          },
        });

        result.success++;
      } catch (error: any) {
        console.error(`Error importing row ${rowNum}:`, error);
        result.failed++;
        result.errors.push({
          row: rowNum,
          error: error.message || 'Failed to create booking',
          data: row,
        });
      }
    }

    return NextResponse.json({
      success: true,
      result,
      message: `Imported ${result.success} bookings successfully${
        result.clientsCreated > 0 ? `, created ${result.clientsCreated} new clients` : ''
      }${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
    });
  } catch (error) {
    console.error('POST /api/bookings/import error:', error);
    return NextResponse.json(
      { success: false, error: 'Import failed. Please try again.' },
      { status: 500 }
    );
  }
}
