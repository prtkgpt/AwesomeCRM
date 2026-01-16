#!/usr/bin/env npx tsx
/**
 * Standalone Data Restoration Script for Awesome Maids LLC
 *
 * Run with: DATABASE_URL="your-neon-url" npx tsx scripts/restore-data.ts
 *
 * Or set DATABASE_URL in your environment first, then run:
 * npx tsx scripts/restore-data.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

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

// Awesome Maids LLC company ID - you may need to update this
const AWESOME_MAIDS_COMPANY_ID = 'cmjz0bvdy0000hnly2pvx5u5f';

// Normalize phone number for comparison
function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

// Clean phone formatting
function cleanPhone(phone: string): string {
  return phone.replace(/['"]/g, '').trim();
}

// Clean string with quotes
function cleanString(str: string): string {
  return str.replace(/['"]/g, '').trim();
}

// Parse CSV line handling quoted fields
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

// Parse CSV content
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    records.push(record);
  }

  return records;
}

// Parse date from CSV format
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const cleaned = dateStr.replace(/['"]/g, '').trim();
  const date = new Date(cleaned);
  return isNaN(date.getTime()) ? null : date;
}

// Parse duration string to minutes
function parseDuration(durationStr: string): number {
  if (!durationStr) return 120;
  const cleaned = durationStr.replace(/['"]/g, '').trim();
  const parts = cleaned.split(':');
  if (parts.length >= 2) {
    return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
  }
  return 120;
}

// Map booking status from CSV to database enum
function mapBookingStatus(status: string): string {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('complete')) return 'COMPLETED';
  if (statusLower.includes('cancel')) return 'CANCELLED';
  if (statusLower.includes('confirm')) return 'CONFIRMED';
  if (statusLower.includes('pending')) return 'PENDING';
  return 'PENDING';
}

// Map service type
function mapServiceType(service: string): string {
  const serviceLower = service.toLowerCase();
  if (serviceLower.includes('deep')) return 'DEEP_CLEAN';
  if (serviceLower.includes('move')) return 'MOVE_IN_OUT';
  if (serviceLower.includes('office') || serviceLower.includes('commercial')) return 'COMMERCIAL';
  return 'STANDARD';
}

// Map recurrence
function mapRecurrence(frequency: string): { isRecurring: boolean; recurrenceFrequency: string | null } {
  const freqLower = frequency.toLowerCase();
  if (freqLower.includes('weekly')) return { isRecurring: true, recurrenceFrequency: 'WEEKLY' };
  if (freqLower.includes('bi-weekly') || freqLower.includes('biweekly')) return { isRecurring: true, recurrenceFrequency: 'BIWEEKLY' };
  if (freqLower.includes('monthly')) return { isRecurring: true, recurrenceFrequency: 'MONTHLY' };
  return { isRecurring: false, recurrenceFrequency: null };
}

// Check if booking matches target client
function matchesTargetClient(booking: Record<string, string>): typeof TARGET_CLIENTS[0] | null {
  const bookingPhone = normalizePhone(cleanPhone(booking['Phone'] || ''));
  const bookingEmail = (booking['Email'] || '').toLowerCase().trim();
  const bookingName = (booking['Full name'] || `${booking['First name'] || ''} ${booking['Last name'] || ''}`.trim()).toLowerCase();

  for (const client of TARGET_CLIENTS) {
    const clientPhone = normalizePhone(client.phone);
    const clientEmail = (client.email || '').toLowerCase();
    const clientName = client.name.toLowerCase();

    if (bookingPhone && clientPhone && bookingPhone === clientPhone) return client;
    if (bookingEmail && clientEmail && bookingEmail === clientEmail) return client;
    if (bookingName && clientName && bookingName === clientName) return client;
  }

  return null;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Data Restoration Script for Awesome Maids LLC');
  console.log('='.repeat(60));
  console.log('');

  // Check database connection
  try {
    await prisma.$connect();
    console.log('Connected to database successfully');
  } catch (error) {
    console.error('Failed to connect to database. Make sure DATABASE_URL is set.');
    console.error('Run with: DATABASE_URL="your-neon-url" npx tsx scripts/restore-data.ts');
    process.exit(1);
  }

  // Find a user to associate restored data with
  const adminUser = await prisma.user.findFirst({
    where: {
      companyId: AWESOME_MAIDS_COMPANY_ID,
      role: { in: ['OWNER', 'ADMIN'] },
    },
    select: { id: true, companyId: true, email: true },
  });

  if (!adminUser) {
    console.error(`No admin user found for company ${AWESOME_MAIDS_COMPANY_ID}`);
    console.error('Please update AWESOME_MAIDS_COMPANY_ID in this script');

    // List available companies
    const companies = await prisma.company.findMany({
      select: { id: true, name: true },
      take: 10,
    });
    console.log('\nAvailable companies:');
    companies.forEach(c => console.log(`  ${c.id}: ${c.name}`));
    process.exit(1);
  }

  console.log(`Using admin user: ${adminUser.email}`);
  console.log(`Company ID: ${adminUser.companyId}`);
  console.log('');

  const companyId = adminUser.companyId;
  const userId = adminUser.id;

  // Track results
  const results = {
    clients: { restored: 0, skipped: 0, errors: [] as string[] },
    addresses: { restored: 0 },
    bookings: { restored: 0, skipped: 0, matched: 0, errors: [] as string[] },
  };

  // STEP 1: Restore clients
  console.log(`Restoring ${TARGET_CLIENTS.length} target clients...`);

  for (const clientData of TARGET_CLIENTS) {
    try {
      const existingById = await prisma.client.findUnique({
        where: { id: clientData.id },
      });

      if (existingById) {
        results.clients.skipped++;
        continue;
      }

      // Check by phone/email
      const orConditions: any[] = [];
      if (clientData.phone) orConditions.push({ phone: clientData.phone });
      if (clientData.email) orConditions.push({ email: clientData.email });

      if (orConditions.length > 0) {
        const existingByContact = await prisma.client.findFirst({
          where: { companyId, OR: orConditions },
        });

        if (existingByContact) {
          results.clients.skipped++;
          continue;
        }
      }

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
      console.log(`  + Restored client: ${clientData.name}`);
    } catch (error: any) {
      results.clients.errors.push(`${clientData.name}: ${error.message}`);
      console.error(`  ! Error restoring ${clientData.name}: ${error.message}`);
    }
  }

  console.log(`\nClients: ${results.clients.restored} restored, ${results.clients.skipped} skipped`);

  // STEP 2: Restore bookings from CSV
  const projectRoot = process.cwd();
  const bookingsFile = path.join(projectRoot, '1767625502_bookings_2025-01-01-to-2025-12-31.csv');
  const customersFile = path.join(projectRoot, '1767625849_customers_all_time.csv');

  if (!fs.existsSync(bookingsFile)) {
    console.log('\nBookings CSV not found - skipping booking restoration');
    console.log(`Expected at: ${bookingsFile}`);
  } else {
    console.log('\nProcessing bookings from CSV...');

    // Read customer addresses
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
      console.log(`  Loaded ${customerAddresses.size} customer addresses`);
    }

    // Read bookings
    const bookingsContent = fs.readFileSync(bookingsFile, 'utf-8');
    const bookings = parseCSV(bookingsContent);
    console.log(`  Found ${bookings.length} bookings in backup`);

    const clientAddressMap = new Map<string, string>();

    for (const booking of bookings) {
      const matchedClient = matchesTargetClient(booking);
      if (!matchedClient) continue;

      results.bookings.matched++;

      const bookingStartStr = booking['Booking start date time'] || '';
      const scheduledDate = parseDate(bookingStartStr);
      const duration = parseDuration(booking['Estimated job length (HH:MM)'] || '');
      const priceStr = booking['Final amount (USD)'] || booking['Service total (USD)'] || '0';
      const price = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
      const status = mapBookingStatus(booking['Booking status'] || '');
      const serviceType = mapServiceType(booking['Frequency'] || booking['Service'] || '');
      const { isRecurring, recurrenceFrequency } = mapRecurrence(booking['Frequency'] || '');
      const notes = booking['Booking note'] || '';
      const internalNotes = booking['Private customer note'] || booking['Provider note'] || '';

      let address = booking['Address'] || '';
      let city = booking['City'] || '';
      let state = booking['State'] || '';
      let zip = cleanString(booking['Zip/Postal code'] || '');

      if (!address || !city) {
        const clientPhone = normalizePhone(matchedClient.phone);
        const clientEmail = (matchedClient.email || '').toLowerCase();
        const addressInfo = customerAddresses.get(`phone:${clientPhone}`) || customerAddresses.get(`email:${clientEmail}`);
        if (addressInfo) {
          address = addressInfo.address;
          city = addressInfo.city;
          state = addressInfo.state;
          zip = addressInfo.zip;
        }
      }

      if (!scheduledDate) continue;

      try {
        const clientId = matchedClient.id;
        let addressId = clientAddressMap.get(clientId);

        if (!addressId) {
          const existingAddress = await prisma.address.findFirst({ where: { clientId } });
          if (existingAddress) {
            addressId = existingAddress.id;
          } else {
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

        // Check for existing booking
        const twoHoursBefore = new Date(scheduledDate.getTime() - 2 * 60 * 60 * 1000);
        const twoHoursAfter = new Date(scheduledDate.getTime() + 2 * 60 * 60 * 1000);

        const existingBooking = await prisma.booking.findFirst({
          where: {
            companyId,
            clientId,
            scheduledDate: { gte: twoHoursBefore, lte: twoHoursAfter },
          },
        });

        if (existingBooking) {
          results.bookings.skipped++;
          continue;
        }

        await prisma.booking.create({
          data: {
            companyId,
            clientId,
            addressId,
            userId,
            scheduledDate,
            duration,
            price,
            status,
            serviceType,
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

    console.log(`\nBookings: ${results.bookings.matched} matched, ${results.bookings.restored} restored, ${results.bookings.skipped} skipped`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('RESTORATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Clients:   ${results.clients.restored} restored, ${results.clients.skipped} already existed`);
  console.log(`Addresses: ${results.addresses.restored} created`);
  console.log(`Bookings:  ${results.bookings.restored} restored, ${results.bookings.skipped} already existed`);

  if (results.clients.errors.length > 0) {
    console.log('\nClient errors:');
    results.clients.errors.slice(0, 5).forEach(e => console.log(`  - ${e}`));
  }

  if (results.bookings.errors.length > 0) {
    console.log('\nBooking errors:');
    results.bookings.errors.slice(0, 5).forEach(e => console.log(`  - ${e}`));
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
