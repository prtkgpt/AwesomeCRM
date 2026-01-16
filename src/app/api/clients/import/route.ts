import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string; data?: any }>;
}

// Field name mappings from various CRMs to our schema
const FIELD_MAPPINGS: Record<string, string> = {
  // Name fields
  'full name': 'fullName',
  'fullname': 'fullName',
  'name': 'fullName',
  'client name': 'fullName',
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

  // Other fields
  'note': 'notes',
  'notes': 'notes',
  'tags': 'tags',
  'tag': 'tags',
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

function extractClientData(row: Record<string, string>) {
  // Extract name
  let name = row.fullName || '';
  if (!name && (row.firstName || row.lastName)) {
    name = `${row.firstName || ''} ${row.lastName || ''}`.trim();
  }

  // Extract tags
  let tags: string[] = [];
  if (row.tags) {
    tags = row.tags.split(/[,;]/).map(t => t.trim()).filter(Boolean);
  }

  // Extract phone - clean it up
  let phone = row.phone || '';
  if (phone) {
    // Remove common formatting characters
    phone = phone.replace(/[\s\-\(\)\.]/g, '');
  }

  // Extract state - ensure it's 2 characters
  let state = row.state || '';
  if (state.length > 2) {
    // Try to convert common state names to abbreviations
    const stateMap: Record<string, string> = {
      'california': 'CA', 'new york': 'NY', 'texas': 'TX', 'florida': 'FL',
      'illinois': 'IL', 'pennsylvania': 'PA', 'ohio': 'OH', 'georgia': 'GA',
      'north carolina': 'NC', 'michigan': 'MI', 'new jersey': 'NJ', 'virginia': 'VA',
      'washington': 'WA', 'arizona': 'AZ', 'massachusetts': 'MA', 'tennessee': 'TN',
      'indiana': 'IN', 'missouri': 'MO', 'maryland': 'MD', 'wisconsin': 'WI',
      'colorado': 'CO', 'minnesota': 'MN', 'south carolina': 'SC', 'alabama': 'AL',
      'louisiana': 'LA', 'kentucky': 'KY', 'oregon': 'OR', 'oklahoma': 'OK',
      'connecticut': 'CT', 'iowa': 'IA', 'utah': 'UT', 'nevada': 'NV',
      'arkansas': 'AR', 'mississippi': 'MS', 'kansas': 'KS', 'new mexico': 'NM',
      'nebraska': 'NE', 'west virginia': 'WV', 'idaho': 'ID', 'hawaii': 'HI',
      'new hampshire': 'NH', 'maine': 'ME', 'montana': 'MT', 'rhode island': 'RI',
      'delaware': 'DE', 'south dakota': 'SD', 'north dakota': 'ND', 'alaska': 'AK',
      'vermont': 'VT', 'wyoming': 'WY',
    };
    state = stateMap[state.toLowerCase()] || state.substring(0, 2).toUpperCase();
  }

  return {
    name,
    email: row.email || undefined,
    phone: phone || undefined,
    tags,
    notes: row.notes || undefined,
    address: {
      street: row.street || '',
      city: row.city || '',
      state: state || '',
      zip: row.zip || '',
    },
  };
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
        { error: 'Only owners and admins can import clients' },
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
      errors: [],
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // +2 because row 1 is headers and arrays are 0-indexed
      const row = rows[i];

      try {
        const clientData = extractClientData(row);

        // Validate required fields
        if (!clientData.name || !clientData.name.trim()) {
          result.failed++;
          result.errors.push({
            row: rowNum,
            error: 'Name is required',
            data: row,
          });
          continue;
        }

        // Check if address has at least street
        const hasAddress = clientData.address.street.trim() !== '';

        // Create client
        await prisma.client.create({
          data: {
            companyId: user.companyId,
            userId: session.user.id,
            name: clientData.name,
            email: clientData.email || null,
            phone: clientData.phone,
            tags: clientData.tags,
            notes: clientData.notes,
            addresses: hasAddress
              ? {
                  create: [
                    {
                      street: clientData.address.street,
                      city: clientData.address.city,
                      state: clientData.address.state,
                      zip: clientData.address.zip,
                    },
                  ],
                }
              : undefined,
          },
        });

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          error: error.message || 'Failed to create client',
          data: row,
        });
      }
    }

    return NextResponse.json({
      success: true,
      result,
      message: `Imported ${result.success} clients successfully${
        result.failed > 0 ? `, ${result.failed} failed` : ''
      }`,
    });
  } catch (error) {
    console.error('POST /api/clients/import error:', error);
    return NextResponse.json(
      { success: false, error: 'Import failed. Please try again.' },
      { status: 500 }
    );
  }
}
