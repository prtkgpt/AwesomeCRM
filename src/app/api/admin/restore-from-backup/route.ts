import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// The 45 specific clients to restore for Awesome Maids LLC
const TARGET_CLIENTS = [
  { id: 'cmkg63kgg0004ml9zmmixyomf', name: 'P Gupta', email: 'bizwithpg@gmail.com', phone: '4085719370', createdAt: new Date('2026-01-16 00:55:59.824') },
  { id: 'cmkg387sk0001ml9z2v3m301h', name: 'Linda Dippel', email: '', phone: '5552500779', createdAt: new Date('2026-01-15 23:35:37.844') },
  { id: 'cmkdfje3n0001timsxlgqokez', name: 'Dale Evans', email: '', phone: '(408)608-4579', createdAt: new Date('2026-01-14 02:56:56.099') },
  { id: 'cmkbzyqkd0001ei5fero3c3ov', name: 'Kathy Franks', email: '', phone: '(559)269-3536', createdAt: new Date('2026-01-13 02:53:12.06') },
  { id: 'cmkbzspp1000swqtg0qdycw7k', name: 'Jason Kawamoto', email: 'jkawamoto211@gmail.com', phone: '(559)696-9269', createdAt: new Date('2026-01-13 02:48:30.997') },
  { id: 'cmkbzouue0001wqtgvb7tzocu', name: 'Amiya Kumar Das', email: 'amiya.appu1989@gmail.com', phone: '(301)541-9589', createdAt: new Date('2026-01-13 02:45:31.045') },
  { id: 'cmkbzlico00017gdbk1zk6ni9', name: 'Virginia Vasquez', email: '', phone: '(559)392-2503', createdAt: new Date('2026-01-13 02:42:54.888') },
  { id: 'cmkbzd5a20001w6c20ykxw5el', name: 'Mary Moo', email: 'eugeneit510@gmail.com', phone: '(415)439-9839', createdAt: new Date('2026-01-13 02:36:24.697') },
  { id: 'cmkbyji0n0003y7t2tofnjr8j', name: 'Alexandra Karpilow', email: 'alex.karpilow@gmail.com', phone: '(360)301-5847', createdAt: new Date('2026-01-13 02:13:21.527') },
  { id: 'cmkbydnxt0003bxh1qmsp240u', name: 'Simone Muller', email: '', phone: '(559) 960-7123', createdAt: new Date('2026-01-13 02:08:49.266') },
  { id: 'cmkby7p310001u7rls6cy94ur', name: 'Tony Abi-Rached', email: '', phone: '(559)355-3316', createdAt: new Date('2026-01-13 02:04:10.812') },
  { id: 'cmkby34gf000188p2qe7y2v1w', name: 'David Garcia', email: '', phone: '(408)656-4199', createdAt: new Date('2026-01-13 02:00:37.455') },
  { id: 'cmkbxxxa40001s33jzu21df5t', name: 'Suzanne Nguyen', email: '', phone: '(408)569-0956', createdAt: new Date('2026-01-13 01:56:34.876') },
  { id: 'cmkbu4flr0001velhp636jxtz', name: 'Timothy Anderson', email: '', phone: '(559)317-8953', createdAt: new Date('2026-01-13 00:09:40.095') },
  { id: 'cmkbsrylr0001gcwferokpkxs', name: 'Barbara Thompson', email: '', phone: '(559)960-0850', createdAt: new Date('2026-01-12 23:31:58.574') },
  { id: 'cmkbjxkfo0001z4k0fv7v595d', name: 'Elizabeth Nguyen', email: '', phone: '(510)825-4177', createdAt: new Date('2026-01-12 19:24:23.603') },
  { id: 'cmk7pvq2o000e11lxevhdn4is', name: 'Martha Olmos', email: '', phone: '(559)696-5875', createdAt: new Date('2026-01-10 02:59:50.593') },
  { id: 'cmk7plejy000a11lxscbsdmwo', name: 'Akchhara Pandey', email: 'akchharaa@gmail.com', phone: '(510)902-9495', createdAt: new Date('2026-01-10 02:51:49.102') },
  { id: 'cmk7pimly000511lxffpg3nic', name: 'Maria Duran', email: '', phone: '(209)621-4324', createdAt: new Date('2026-01-10 02:49:39.574') },
  { id: 'cmk7of7du000111lxgklu9j5a', name: 'Arnab Paul', email: 'pa.arnab@gmail.com', phone: '(408)646-5170', createdAt: new Date('2026-01-10 02:19:00.257') },
  { id: 'cmk7ayjhj00012b5cjd1x333u', name: 'Karen Nunn', email: '', phone: '(559)304-9242', createdAt: new Date('2026-01-09 20:02:07.782') },
  { id: 'cmk7awgxm0001n6dqrwgvgz0a', name: 'Kathleen Petroff', email: '', phone: '(559)614-1695', createdAt: new Date('2026-01-09 20:00:31.162') },
  { id: 'cmk7auf6n0007ziax9hyz1yrg', name: 'Loretta Rehbein', email: '', phone: '(559)298-7636', createdAt: new Date('2026-01-09 19:58:55.584') },
  { id: 'cmk7asc5h0004ziax5u58fqb2', name: 'Joy Moore', email: '', phone: '(559)313-0110', createdAt: new Date('2026-01-09 19:57:18.341') },
  { id: 'cmk7ap8d80001ziaxr4svbksn', name: 'Kimberly Troxel', email: '', phone: '(559)284-4648', createdAt: new Date('2026-01-09 19:54:53.468') },
  { id: 'cmk7am368000aguqc9jfrrpul', name: 'Richard Gaxiola', email: '', phone: '(408)593-3097', createdAt: new Date('2026-01-09 19:52:26.769') },
  { id: 'cmk7ak34f000944i7ol5xokl9', name: 'Helen Loy', email: '', phone: '(559)770-5768', createdAt: new Date('2026-01-09 19:50:53.392') },
  { id: 'cmk7agpkk0007guqc52bmj94b', name: 'Cynthia Howell', email: '', phone: '(559)301-3951', createdAt: new Date('2026-01-09 19:48:15.86') },
  { id: 'cmk7acz5g000644i7dk0e05ba', name: 'Laniece Grijalva', email: '', phone: '(951)440-5317', createdAt: new Date('2026-01-09 19:45:21.652') },
  { id: 'cmk7a7yg9000344i77g9b0kj6', name: 'Chin Lu', email: '', phone: '(510)928-1769', createdAt: new Date('2026-01-09 19:41:27.466') },
  { id: 'cmk7a2s5p0004guqcs3e5croo', name: 'Patricia Urrutia', email: '', phone: '(559)705-3223', createdAt: new Date('2026-01-09 19:37:26.03') },
  { id: 'cmk79zvao0001guqc06n3sew1', name: 'Barbara Anderson', email: '', phone: '(559)312-0165', createdAt: new Date('2026-01-09 19:35:10.127') },
  { id: 'cmk77g7c400016ua4q0l82wif', name: 'Doroteo Mejia', email: '', phone: '559-704-6944', createdAt: new Date('2026-01-09 18:23:53.38') },
  { id: 'cmk67p5xg0001gej6fbzte2z4', name: 'Linda Rosado Mendez', email: 'cleanrosadolinda@gmial.com', phone: '5592940580', createdAt: new Date('2026-01-09 01:43:05.283') },
  { id: 'cmk5xs3xt00034ybq1x7eip70', name: 'Rosario Pinedo', email: '', phone: '559-313-3551', createdAt: new Date('2026-01-08 21:05:26.513') },
  { id: 'cmk5xju270006jkhmi0l4u0eb', name: 'Daniel Flores', email: '', phone: '5594548424', createdAt: new Date('2026-01-08 20:59:00.463') },
  { id: 'cmk5r3zuj000111pfauu4i2aq', name: 'Lorraine Rivera', email: 'helperlorraine@gmail.com', phone: '(408)806-4921', createdAt: new Date('2026-01-08 17:58:43.771') },
  { id: 'cmk4mefrm0001qa37futsiwh8', name: 'Susan Ayers', email: 'carecaoncierge+45@thehelperbees.com', phone: '775-857-9645', createdAt: new Date('2026-01-07 22:59:06.705') },
  { id: 'cmk4kv6p30001bv42u96i5b41', name: 'Rosa Bailon', email: 'careconciergeadvisorsss@thehelperbees.com', phone: '619-251-1181', createdAt: new Date('2026-01-07 22:16:08.87') },
  { id: 'cmk3dxnis0004frucnxs1q3vn', name: 'Mark Condell', email: '', phone: '2096267675', createdAt: new Date('2026-01-07 02:14:20.5') },
  { id: 'cmk3d4g4h000baazpd0m1tagm', name: 'Raghbir Dindral', email: 'dindral@awesomemaids.com', phone: '209-480-3916', createdAt: new Date('2026-01-07 01:51:37.889') },
  { id: 'cmk35wmy10001y7ys2vb83au2', name: 'Jessica Smith', email: 'theoriginalsock@gmail.com', phone: '630-310-2999', createdAt: new Date('2026-01-06 22:29:36.168') },
  { id: 'cmk253q9y00012qwinzgxlpgt', name: 'Tameem Rahel', email: '', phone: '7024166330', createdAt: new Date('2026-01-06 05:19:21.285') },
  { id: 'cmk249ptb00015jl62xmor980', name: 'Mark Condell', email: '', phone: '2096267675', createdAt: new Date('2026-01-06 04:56:01.006') },
  { id: 'cmk0rilwt000c78nvcgdepshg', name: 'Jaya Singhal', email: 'singhaljaya@gmail.com', phone: '4088380687', createdAt: new Date('2026-01-05 06:11:14.669') },
];

// Normalize phone number for comparison
function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

// Helper to parse CSV (handles quoted fields with commas)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

// Parse CSV file into array of objects
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row);
  }

  return rows;
}

// Clean phone number for storage
function cleanPhone(phone: string): string {
  if (!phone) return '';
  // Remove ="..." wrapper if present
  phone = phone.replace(/^="(.+)"$/, '$1');
  return phone.trim();
}

// Clean string value
function cleanString(value: string): string {
  if (!value) return '';
  // Remove ="..." wrapper if present
  value = value.replace(/^="(.+)"$/, '$1');
  return value.trim();
}

// Parse date from various formats
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try ISO format first (2025-01-02T11:00:00-08:00)
  if (dateStr.includes('T')) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
  }

  // Try MM/DD/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [month, day, year] = parts;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

// Map booking status from backup format
function mapBookingStatus(status: string): 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'CLEANER_COMPLETED' | 'NO_SHOW' {
  const statusUpper = (status || '').toUpperCase();

  if (statusUpper.includes('CANCEL')) return 'CANCELLED';
  if (statusUpper.includes('COMPLETE') || statusUpper.includes('DONE')) return 'COMPLETED';
  if (statusUpper.includes('NO SHOW') || statusUpper.includes('NO_SHOW')) return 'NO_SHOW';

  return 'SCHEDULED';
}

// Map frequency to service type
function mapServiceType(frequency: string): 'STANDARD' | 'DEEP' | 'MOVE_OUT' {
  const freq = (frequency || '').toLowerCase();

  if (freq.includes('deep')) return 'DEEP';
  if (freq.includes('move')) return 'MOVE_OUT';

  return 'STANDARD';
}

// Map frequency to recurrence
function mapRecurrence(frequency: string): { isRecurring: boolean; recurrenceFrequency: 'NONE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' } {
  const freq = (frequency || '').toLowerCase();

  if (freq.includes('weekly') && !freq.includes('bi')) {
    return { isRecurring: true, recurrenceFrequency: 'WEEKLY' };
  }
  if (freq.includes('biweekly') || freq.includes('bi-weekly')) {
    return { isRecurring: true, recurrenceFrequency: 'BIWEEKLY' };
  }
  if (freq.includes('monthly')) {
    return { isRecurring: true, recurrenceFrequency: 'MONTHLY' };
  }

  return { isRecurring: false, recurrenceFrequency: 'NONE' };
}

// Parse duration from HH:MM format
function parseDuration(duration: string): number {
  if (!duration) return 120; // Default 2 hours

  const parts = duration.split(':');
  if (parts.length === 2) {
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    return hours * 60 + minutes;
  }

  return 120;
}

// Check if a booking matches one of our target clients
function matchesTargetClient(booking: Record<string, string>): typeof TARGET_CLIENTS[0] | null {
  const bookingPhone = normalizePhone(cleanPhone(booking['Phone'] || ''));
  const bookingEmail = (booking['Email'] || '').toLowerCase().trim();
  const bookingName = (booking['Full name'] || `${booking['First name'] || ''} ${booking['Last name'] || ''}`.trim()).toLowerCase();

  for (const client of TARGET_CLIENTS) {
    const clientPhone = normalizePhone(client.phone);
    const clientEmail = (client.email || '').toLowerCase();
    const clientName = client.name.toLowerCase();

    // Match by phone (most reliable)
    if (bookingPhone && clientPhone && bookingPhone === clientPhone) {
      return client;
    }

    // Match by email (if available)
    if (bookingEmail && clientEmail && bookingEmail === clientEmail) {
      return client;
    }

    // Match by exact name (last resort)
    if (bookingName && clientName && bookingName === clientName) {
      return client;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, companyId: true, role: true },
    });

    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const companyId = user.companyId;
    const userId = user.id;

    // Track restoration results
    const results = {
      clients: { restored: 0, skipped: 0, errors: [] as string[] },
      addresses: { restored: 0, skipped: 0, errors: [] as string[] },
      bookings: { restored: 0, skipped: 0, matched: 0, errors: [] as string[] },
    };

    // Map to track client ID -> address ID for bookings
    const clientAddressMap = new Map<string, string>();

    // STEP 1: Restore the 45 target clients
    console.log(`Restoring ${TARGET_CLIENTS.length} target clients...`);

    for (const clientData of TARGET_CLIENTS) {
      try {
        // Check if client already exists by ID
        const existingById = await prisma.client.findUnique({
          where: { id: clientData.id },
        });

        if (existingById) {
          results.clients.skipped++;
          continue;
        }

        // Also check by phone/email to avoid duplicates
        const existingByContact = await prisma.client.findFirst({
          where: {
            companyId,
            OR: [
              clientData.phone ? { phone: clientData.phone } : {},
              clientData.email ? { email: clientData.email } : {},
            ].filter(o => Object.keys(o).length > 0),
          },
        });

        if (existingByContact) {
          results.clients.skipped++;
          continue;
        }

        // Create client with original ID
        await prisma.client.create({
          data: {
            id: clientData.id,
            companyId,
            userId,
            name: clientData.name,
            email: clientData.email || null,
            phone: clientData.phone || null,
            createdAt: clientData.createdAt,
            updatedAt: clientData.createdAt,
          },
        });

        results.clients.restored++;
      } catch (error: any) {
        results.clients.errors.push(`${clientData.name}: ${error.message}`);
      }
    }

    console.log(`Clients: restored=${results.clients.restored}, skipped=${results.clients.skipped}`);

    // STEP 2: Find and restore bookings for target clients from CSV backup
    const projectRoot = process.cwd();
    const bookingsFile = path.join(projectRoot, '1767625502_bookings_2025-01-01-to-2025-12-31.csv');
    const customersFile = path.join(projectRoot, '1767625849_customers_all_time.csv');

    if (!fs.existsSync(bookingsFile)) {
      return NextResponse.json({
        success: true,
        message: 'Clients restored. Bookings file not found - skipping booking restoration.',
        results,
      });
    }

    // Read customer CSV to get addresses
    const customerAddresses = new Map<string, { address: string; city: string; state: string; zip: string }>();
    if (fs.existsSync(customersFile)) {
      const customersContent = fs.readFileSync(customersFile, 'utf-8');
      const customers = parseCSV(customersContent);

      for (const customer of customers) {
        const phone = normalizePhone(cleanPhone(customer['Phone Number'] || ''));
        const email = (customer['Email Address'] || '').toLowerCase().trim();
        const address = customer['Address'] || '';
        const city = customer['City'] || '';
        const state = customer['State'] || '';
        const zip = cleanString(customer['Zip/Postal Code'] || '');

        if (address && city) {
          if (phone) customerAddresses.set(`phone:${phone}`, { address, city, state, zip });
          if (email) customerAddresses.set(`email:${email}`, { address, city, state, zip });
        }
      }
    }

    // Read and parse bookings CSV
    console.log('Reading bookings CSV...');
    const bookingsContent = fs.readFileSync(bookingsFile, 'utf-8');
    const bookings = parseCSV(bookingsContent);
    console.log(`Found ${bookings.length} bookings in backup`);

    // Filter bookings to only those matching our target clients
    for (const booking of bookings) {
      const matchedClient = matchesTargetClient(booking);

      if (!matchedClient) continue; // Skip bookings not for our 45 clients

      results.bookings.matched++;

      // Booking details
      const bookingStartStr = booking['Booking start date time'] || '';
      const scheduledDate = parseDate(bookingStartStr);
      const duration = parseDuration(booking['Estimated job length (HH:MM)'] || '');

      // Price
      const priceStr = booking['Final amount (USD)'] || booking['Service total (USD)'] || '0';
      const price = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;

      // Status and type
      const status = mapBookingStatus(booking['Booking status'] || '');
      const serviceType = mapServiceType(booking['Frequency'] || booking['Service'] || '');
      const { isRecurring, recurrenceFrequency } = mapRecurrence(booking['Frequency'] || '');

      // Notes
      const notes = booking['Booking note'] || '';
      const internalNotes = booking['Private customer note'] || booking['Provider note'] || '';

      // Address from booking or customer file
      let address = booking['Address'] || '';
      let city = booking['City'] || '';
      let state = booking['State'] || '';
      let zip = cleanString(booking['Zip/Postal code'] || '');

      // If no address in booking, try to get from customer file
      if (!address || !city) {
        const clientPhone = normalizePhone(matchedClient.phone);
        const clientEmail = (matchedClient.email || '').toLowerCase();

        const addressInfo = customerAddresses.get(`phone:${clientPhone}`) ||
                          customerAddresses.get(`email:${clientEmail}`);

        if (addressInfo) {
          address = addressInfo.address;
          city = addressInfo.city;
          state = addressInfo.state;
          zip = addressInfo.zip;
        }
      }

      // Payment
      const isPaid = parseFloat(booking['Amount paid by customer (USD)'] || '0') > 0;
      const paymentMethod = booking['Payment method'] || null;

      if (!scheduledDate) continue;

      try {
        const clientId = matchedClient.id;

        // Find or create address for this client
        let addressId = clientAddressMap.get(clientId);

        if (!addressId) {
          // Check if client already has an address
          const existingAddress = await prisma.address.findFirst({
            where: { clientId },
          });

          if (existingAddress) {
            addressId = existingAddress.id;
          } else {
            // Create address
            const newAddress = await prisma.address.create({
              data: {
                clientId,
                label: 'Home',
                street: address || 'Address needed',
                city: city || 'City needed',
                state: state || '',
                zip: zip || '',
              },
            });
            addressId = newAddress.id;
            results.addresses.restored++;
          }
          clientAddressMap.set(clientId, addressId);
        }

        // Check if booking already exists (same client, same date within 2 hours)
        const twoHoursBefore = new Date(scheduledDate.getTime() - 2 * 60 * 60 * 1000);
        const twoHoursAfter = new Date(scheduledDate.getTime() + 2 * 60 * 60 * 1000);

        const existingBooking = await prisma.booking.findFirst({
          where: {
            companyId,
            clientId,
            scheduledDate: {
              gte: twoHoursBefore,
              lte: twoHoursAfter,
            },
          },
        });

        if (existingBooking) {
          results.bookings.skipped++;
          continue;
        }

        // Create booking
        await prisma.booking.create({
          data: {
            companyId,
            userId,
            clientId,
            addressId,
            scheduledDate,
            duration,
            serviceType,
            status,
            price,
            isPaid,
            paymentMethod,
            isRecurring,
            recurrenceFrequency,
            notes: notes || null,
            internalNotes: internalNotes || null,
          },
        });

        results.bookings.restored++;
      } catch (error: any) {
        results.bookings.errors.push(`${matchedClient.name} (${bookingStartStr}): ${error.message}`);
      }
    }

    console.log(`Bookings: matched=${results.bookings.matched}, restored=${results.bookings.restored}, skipped=${results.bookings.skipped}`);

    return NextResponse.json({
      success: true,
      message: 'Data restoration completed for Awesome Maids LLC (45 clients)',
      results: {
        clients: {
          target: TARGET_CLIENTS.length,
          restored: results.clients.restored,
          skipped: results.clients.skipped,
          errors: results.clients.errors.slice(0, 10),
        },
        addresses: {
          restored: results.addresses.restored,
        },
        bookings: {
          matchedFromBackup: results.bookings.matched,
          restored: results.bookings.restored,
          skipped: results.bookings.skipped,
          errors: results.bookings.errors.slice(0, 10),
        },
      },
    });
  } catch (error: any) {
    console.error('Restoration error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check backup files status and restoration readiness
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const projectRoot = process.cwd();
    const customersFile = path.join(projectRoot, '1767625849_customers_all_time.csv');
    const bookingsFile = path.join(projectRoot, '1767625502_bookings_2025-01-01-to-2025-12-31.csv');

    const customersExists = fs.existsSync(customersFile);
    const bookingsExists = fs.existsSync(bookingsFile);

    // Count existing clients from our target list
    let existingClients = 0;
    let missingClients = 0;

    for (const client of TARGET_CLIENTS) {
      const exists = await prisma.client.findUnique({
        where: { id: client.id },
      });
      if (exists) {
        existingClients++;
      } else {
        missingClients++;
      }
    }

    // Count bookings for existing target clients
    const existingClientIds = TARGET_CLIENTS.map(c => c.id);
    const existingBookings = await prisma.booking.count({
      where: {
        companyId: user.companyId,
        clientId: { in: existingClientIds },
      },
    });

    return NextResponse.json({
      success: true,
      targetClients: {
        total: TARGET_CLIENTS.length,
        existing: existingClients,
        missing: missingClients,
      },
      existingBookingsForTargetClients: existingBookings,
      backupFiles: {
        customers: {
          exists: customersExists,
          path: customersFile,
        },
        bookings: {
          exists: bookingsExists,
          path: bookingsFile,
        },
      },
      message: missingClients > 0
        ? `${missingClients} clients need restoration. POST to this endpoint to restore.`
        : 'All 45 target clients already exist in database.',
      instructions: {
        restore: 'POST /api/admin/restore-from-backup - Restore 45 clients and their bookings',
      },
    });
  } catch (error: any) {
    console.error('Backup check error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
