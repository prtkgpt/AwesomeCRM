#!/usr/bin/env npx tsx
/**
 * Data Recovery Script for 2026 Clients and Bookings
 *
 * This script can:
 * 1. EXPORT: Extract 2026 data from an existing database to JSON
 * 2. IMPORT: Restore data from JSON to a clean database
 *
 * Usage:
 *   Export: DATABASE_URL="source-db-url" npx tsx scripts/recover-2026-data.ts export
 *   Import: DATABASE_URL="target-db-url" npx tsx scripts/recover-2026-data.ts import
 *   Verify: DATABASE_URL="db-url" npx tsx scripts/recover-2026-data.ts verify
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Date range for 2026 data recovery (from January 1, 2026 onwards)
const START_DATE = new Date('2026-01-01T00:00:00.000Z');
const END_DATE = new Date('2026-12-31T23:59:59.999Z');

// Backup file location
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const BACKUP_FILE = path.join(BACKUP_DIR, '2026-data-backup.json');

interface BackupData {
  exportedAt: string;
  company: any;
  users: any[];
  teamMembers: any[];
  clients: any[];
  addresses: any[];
  bookings: any[];
  invoices: any[];
  payments: any[];
  reviews: any[];
}

/**
 * Export 2026 data from the database
 */
async function exportData() {
  console.log('='.repeat(60));
  console.log('EXPORTING 2026 DATA');
  console.log('='.repeat(60));
  console.log(`Date range: ${START_DATE.toISOString()} to ${END_DATE.toISOString()}`);
  console.log('');

  // Find the company (assuming single-tenant for this recovery)
  const company = await prisma.company.findFirst({
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      phone: true,
      timezone: true,
    },
  });

  if (!company) {
    console.error('No company found in database');
    return;
  }

  console.log(`Found company: ${company.name} (${company.id})`);
  const companyId = company.id;

  // Export users
  console.log('\nExporting users...');
  const users = await prisma.user.findMany({
    where: { companyId },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
    },
  });
  console.log(`  Found ${users.length} users`);

  // Export team members
  console.log('Exporting team members...');
  const teamMembers = await prisma.teamMember.findMany({
    where: { companyId },
    select: {
      id: true,
      userId: true,
      employeeId: true,
      hireDate: true,
      hourlyRate: true,
      isActive: true,
      isAvailable: true,
      createdAt: true,
    },
  });
  console.log(`  Found ${teamMembers.length} team members`);

  // Export clients created in 2026
  console.log('Exporting 2026 clients...');
  const clients = await prisma.client.findMany({
    where: {
      companyId,
      createdAt: { gte: START_DATE, lte: END_DATE },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      alternatePhone: true,
      preferredContactMethod: true,
      tags: true,
      source: true,
      notes: true,
      billingEmail: true,
      stripeCustomerId: true,
      autoChargeEnabled: true,
      hasInsurance: true,
      insuranceProvider: true,
      insuranceMemberId: true,
      insurancePaymentAmount: true,
      standardCopay: true,
      discountedCopay: true,
      referralCode: true,
      referredById: true,
      referralTier: true,
      loyaltyTier: true,
      loyaltyPoints: true,
      totalSpent: true,
      totalBookings: true,
      creditBalance: true,
      birthday: true,
      firstBookingDate: true,
      lastBookingDate: true,
      isActive: true,
      isVip: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  console.log(`  Found ${clients.length} clients from 2026`);

  // Get client IDs for related data
  const clientIds = clients.map(c => c.id);

  // Export addresses for 2026 clients
  console.log('Exporting addresses...');
  const addresses = await prisma.address.findMany({
    where: { clientId: { in: clientIds } },
    select: {
      id: true,
      clientId: true,
      label: true,
      isPrimary: true,
      street: true,
      unit: true,
      city: true,
      state: true,
      zip: true,
      country: true,
      propertyType: true,
      squareFootage: true,
      bedrooms: true,
      bathrooms: true,
      hasPets: true,
      petDetails: true,
      parkingInfo: true,
      gateCode: true,
      alarmCode: true,
      lockboxCode: true,
      keyLocation: true,
      entryInstructions: true,
      cleanerNotes: true,
      specialInstructions: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  console.log(`  Found ${addresses.length} addresses`);

  // Export bookings for 2026 clients (all bookings, including future ones)
  console.log('Exporting bookings...');
  const bookings = await prisma.booking.findMany({
    where: {
      companyId,
      clientId: { in: clientIds },
    },
    select: {
      id: true,
      bookingNumber: true,
      clientId: true,
      addressId: true,
      createdById: true,
      serviceType: true,
      scheduledDate: true,
      scheduledEndDate: true,
      duration: true,
      timeSlot: true,
      assignedCleanerId: true,
      status: true,
      basePrice: true,
      addons: true,
      subtotal: true,
      discountAmount: true,
      discountCode: true,
      taxAmount: true,
      creditsApplied: true,
      tipAmount: true,
      finalPrice: true,
      hasInsurance: true,
      insuranceAmount: true,
      copayAmount: true,
      paymentStatus: true,
      paymentMethod: true,
      isPaid: true,
      paidAt: true,
      isRecurring: true,
      recurrenceFrequency: true,
      recurrenceParentId: true,
      customerNotes: true,
      internalNotes: true,
      cleanerNotes: true,
      onMyWayAt: true,
      arrivedAt: true,
      clockedInAt: true,
      clockedOutAt: true,
      completedAt: true,
      cancelledAt: true,
      cancellationReason: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  console.log(`  Found ${bookings.length} bookings`);

  // Export invoices for 2026 clients
  console.log('Exporting invoices...');
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      clientId: { in: clientIds },
    },
    select: {
      id: true,
      invoiceNumber: true,
      clientId: true,
      bookingId: true,
      issueDate: true,
      dueDate: true,
      paidDate: true,
      status: true,
      lineItems: true,
      subtotal: true,
      discountAmount: true,
      taxAmount: true,
      total: true,
      amountPaid: true,
      amountDue: true,
      notes: true,
      sentAt: true,
      viewedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  console.log(`  Found ${invoices.length} invoices`);

  // Export payments for 2026 clients
  console.log('Exporting payments...');
  const payments = await prisma.payment.findMany({
    where: {
      companyId,
      clientId: { in: clientIds },
    },
    select: {
      id: true,
      clientId: true,
      bookingId: true,
      invoiceId: true,
      amount: true,
      method: true,
      status: true,
      transactionId: true,
      stripePaymentIntentId: true,
      authorizedAt: true,
      capturedAt: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  console.log(`  Found ${payments.length} payments`);

  // Export reviews
  console.log('Exporting reviews...');
  const bookingIds = bookings.map(b => b.id);
  const reviews = await prisma.review.findMany({
    where: { bookingId: { in: bookingIds } },
    select: {
      id: true,
      bookingId: true,
      clientId: true,
      cleanerId: true,
      overallRating: true,
      qualityRating: true,
      punctualityRating: true,
      communicationRating: true,
      title: true,
      comment: true,
      responseText: true,
      respondedAt: true,
      isPublic: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  console.log(`  Found ${reviews.length} reviews`);

  // Create backup object
  const backup: BackupData = {
    exportedAt: new Date().toISOString(),
    company,
    users,
    teamMembers,
    clients,
    addresses,
    bookings,
    invoices,
    payments,
    reviews,
  };

  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Write backup file
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('EXPORT COMPLETE');
  console.log('='.repeat(60));
  console.log(`Backup saved to: ${BACKUP_FILE}`);
  console.log(`\nSummary:`);
  console.log(`  Company:      ${company.name}`);
  console.log(`  Users:        ${users.length}`);
  console.log(`  Team Members: ${teamMembers.length}`);
  console.log(`  Clients:      ${clients.length}`);
  console.log(`  Addresses:    ${addresses.length}`);
  console.log(`  Bookings:     ${bookings.length}`);
  console.log(`  Invoices:     ${invoices.length}`);
  console.log(`  Payments:     ${payments.length}`);
  console.log(`  Reviews:      ${reviews.length}`);
}

/**
 * Import 2026 data into a clean database
 */
async function importData() {
  console.log('='.repeat(60));
  console.log('IMPORTING 2026 DATA');
  console.log('='.repeat(60));

  // Check if backup file exists
  if (!fs.existsSync(BACKUP_FILE)) {
    console.error(`Backup file not found: ${BACKUP_FILE}`);
    console.error('Run export first: npx tsx scripts/recover-2026-data.ts export');
    return;
  }

  // Read backup file
  const backupContent = fs.readFileSync(BACKUP_FILE, 'utf-8');
  const backup: BackupData = JSON.parse(backupContent);

  console.log(`Backup from: ${backup.exportedAt}`);
  console.log(`Company: ${backup.company.name}`);
  console.log('');

  // Track results
  const results = {
    users: { created: 0, skipped: 0 },
    teamMembers: { created: 0, skipped: 0 },
    clients: { created: 0, skipped: 0 },
    addresses: { created: 0, skipped: 0 },
    bookings: { created: 0, skipped: 0 },
    invoices: { created: 0, skipped: 0 },
    payments: { created: 0, skipped: 0 },
    reviews: { created: 0, skipped: 0 },
  };

  // Check if company exists, create if not
  let company = await prisma.company.findUnique({
    where: { id: backup.company.id },
  });

  if (!company) {
    company = await prisma.company.findFirst({
      where: { slug: backup.company.slug },
    });
  }

  if (!company) {
    console.log('Creating company...');
    company = await prisma.company.create({
      data: {
        id: backup.company.id,
        name: backup.company.name,
        slug: backup.company.slug,
        email: backup.company.email,
        phone: backup.company.phone,
        timezone: backup.company.timezone || 'America/Los_Angeles',
      },
    });
    console.log(`  Created company: ${company.name}`);
  } else {
    console.log(`  Using existing company: ${company.name}`);
  }

  const companyId = company.id;

  // Import users
  console.log('\nImporting users...');
  for (const userData of backup.users) {
    const existing = await prisma.user.findUnique({
      where: { id: userData.id },
    });
    if (existing) {
      results.users.skipped++;
      continue;
    }

    // Check by email
    const existingByEmail = await prisma.user.findUnique({
      where: { email: userData.email },
    });
    if (existingByEmail) {
      results.users.skipped++;
      continue;
    }

    try {
      await prisma.user.create({
        data: {
          id: userData.id,
          companyId,
          email: userData.email,
          passwordHash: userData.passwordHash,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          role: userData.role,
          isActive: userData.isActive,
          isVerified: userData.isVerified,
          createdAt: new Date(userData.createdAt),
        },
      });
      results.users.created++;
    } catch (error: any) {
      console.error(`  Error creating user ${userData.email}: ${error.message}`);
    }
  }
  console.log(`  Created: ${results.users.created}, Skipped: ${results.users.skipped}`);

  // Import team members
  console.log('Importing team members...');
  for (const tmData of backup.teamMembers) {
    const existing = await prisma.teamMember.findUnique({
      where: { id: tmData.id },
    });
    if (existing) {
      results.teamMembers.skipped++;
      continue;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: tmData.userId } });
    if (!user) {
      results.teamMembers.skipped++;
      continue;
    }

    // Check if user already has a team member record
    const existingByUser = await prisma.teamMember.findUnique({
      where: { userId: tmData.userId },
    });
    if (existingByUser) {
      results.teamMembers.skipped++;
      continue;
    }

    try {
      await prisma.teamMember.create({
        data: {
          id: tmData.id,
          companyId,
          userId: tmData.userId,
          employeeId: tmData.employeeId,
          hireDate: tmData.hireDate ? new Date(tmData.hireDate) : null,
          hourlyRate: tmData.hourlyRate,
          isActive: tmData.isActive,
          isAvailable: tmData.isAvailable,
          createdAt: new Date(tmData.createdAt),
        },
      });
      results.teamMembers.created++;
    } catch (error: any) {
      console.error(`  Error creating team member: ${error.message}`);
    }
  }
  console.log(`  Created: ${results.teamMembers.created}, Skipped: ${results.teamMembers.skipped}`);

  // Import clients
  console.log('Importing clients...');
  for (const clientData of backup.clients) {
    const existing = await prisma.client.findUnique({
      where: { id: clientData.id },
    });
    if (existing) {
      results.clients.skipped++;
      continue;
    }

    try {
      await prisma.client.create({
        data: {
          id: clientData.id,
          companyId,
          firstName: clientData.firstName,
          lastName: clientData.lastName,
          email: clientData.email,
          phone: clientData.phone,
          alternatePhone: clientData.alternatePhone,
          preferredContactMethod: clientData.preferredContactMethod || 'EMAIL',
          tags: clientData.tags || [],
          source: clientData.source,
          notes: clientData.notes,
          billingEmail: clientData.billingEmail,
          stripeCustomerId: clientData.stripeCustomerId,
          autoChargeEnabled: clientData.autoChargeEnabled || false,
          hasInsurance: clientData.hasInsurance || false,
          insuranceProvider: clientData.insuranceProvider,
          insuranceMemberId: clientData.insuranceMemberId,
          insurancePaymentAmount: clientData.insurancePaymentAmount,
          standardCopay: clientData.standardCopay,
          discountedCopay: clientData.discountedCopay,
          referralCode: clientData.referralCode,
          referralTier: clientData.referralTier || 'NONE',
          loyaltyTier: clientData.loyaltyTier || 'BASIC',
          loyaltyPoints: clientData.loyaltyPoints || 0,
          totalSpent: clientData.totalSpent || 0,
          totalBookings: clientData.totalBookings || 0,
          creditBalance: clientData.creditBalance || 0,
          birthday: clientData.birthday ? new Date(clientData.birthday) : null,
          firstBookingDate: clientData.firstBookingDate ? new Date(clientData.firstBookingDate) : null,
          lastBookingDate: clientData.lastBookingDate ? new Date(clientData.lastBookingDate) : null,
          isActive: clientData.isActive ?? true,
          isVip: clientData.isVip || false,
          createdAt: new Date(clientData.createdAt),
          updatedAt: new Date(clientData.updatedAt),
        },
      });
      results.clients.created++;
    } catch (error: any) {
      console.error(`  Error creating client ${clientData.firstName} ${clientData.lastName}: ${error.message}`);
    }
  }
  console.log(`  Created: ${results.clients.created}, Skipped: ${results.clients.skipped}`);

  // Import addresses
  console.log('Importing addresses...');
  for (const addrData of backup.addresses) {
    const existing = await prisma.address.findUnique({
      where: { id: addrData.id },
    });
    if (existing) {
      results.addresses.skipped++;
      continue;
    }

    // Check if client exists
    const client = await prisma.client.findUnique({ where: { id: addrData.clientId } });
    if (!client) {
      results.addresses.skipped++;
      continue;
    }

    try {
      await prisma.address.create({
        data: {
          id: addrData.id,
          clientId: addrData.clientId,
          label: addrData.label,
          isPrimary: addrData.isPrimary || false,
          street: addrData.street,
          unit: addrData.unit,
          city: addrData.city,
          state: addrData.state,
          zip: addrData.zip,
          country: addrData.country || 'US',
          propertyType: addrData.propertyType,
          squareFootage: addrData.squareFootage,
          bedrooms: addrData.bedrooms,
          bathrooms: addrData.bathrooms,
          hasPets: addrData.hasPets || false,
          petDetails: addrData.petDetails,
          parkingInfo: addrData.parkingInfo,
          gateCode: addrData.gateCode,
          alarmCode: addrData.alarmCode,
          lockboxCode: addrData.lockboxCode,
          keyLocation: addrData.keyLocation,
          entryInstructions: addrData.entryInstructions,
          cleanerNotes: addrData.cleanerNotes,
          specialInstructions: addrData.specialInstructions,
          createdAt: new Date(addrData.createdAt),
          updatedAt: new Date(addrData.updatedAt),
        },
      });
      results.addresses.created++;
    } catch (error: any) {
      console.error(`  Error creating address: ${error.message}`);
    }
  }
  console.log(`  Created: ${results.addresses.created}, Skipped: ${results.addresses.skipped}`);

  // Import bookings
  console.log('Importing bookings...');
  for (const bookingData of backup.bookings) {
    const existing = await prisma.booking.findUnique({
      where: { id: bookingData.id },
    });
    if (existing) {
      results.bookings.skipped++;
      continue;
    }

    // Check if client and address exist
    const client = await prisma.client.findUnique({ where: { id: bookingData.clientId } });
    const address = await prisma.address.findUnique({ where: { id: bookingData.addressId } });
    if (!client || !address) {
      results.bookings.skipped++;
      continue;
    }

    try {
      await prisma.booking.create({
        data: {
          id: bookingData.id,
          companyId,
          bookingNumber: bookingData.bookingNumber,
          clientId: bookingData.clientId,
          addressId: bookingData.addressId,
          createdById: bookingData.createdById,
          serviceType: bookingData.serviceType || 'STANDARD',
          scheduledDate: new Date(bookingData.scheduledDate),
          scheduledEndDate: bookingData.scheduledEndDate ? new Date(bookingData.scheduledEndDate) : null,
          duration: bookingData.duration || 120,
          timeSlot: bookingData.timeSlot,
          assignedCleanerId: bookingData.assignedCleanerId,
          status: bookingData.status || 'PENDING',
          basePrice: bookingData.basePrice || 0,
          addons: bookingData.addons,
          subtotal: bookingData.subtotal || bookingData.basePrice || 0,
          discountAmount: bookingData.discountAmount || 0,
          discountCode: bookingData.discountCode,
          taxAmount: bookingData.taxAmount || 0,
          creditsApplied: bookingData.creditsApplied || 0,
          tipAmount: bookingData.tipAmount || 0,
          finalPrice: bookingData.finalPrice || bookingData.basePrice || 0,
          hasInsurance: bookingData.hasInsurance || false,
          insuranceAmount: bookingData.insuranceAmount || 0,
          copayAmount: bookingData.copayAmount || 0,
          paymentStatus: bookingData.paymentStatus || 'PENDING',
          paymentMethod: bookingData.paymentMethod,
          isPaid: bookingData.isPaid || false,
          paidAt: bookingData.paidAt ? new Date(bookingData.paidAt) : null,
          isRecurring: bookingData.isRecurring || false,
          recurrenceFrequency: bookingData.recurrenceFrequency || 'NONE',
          recurrenceParentId: bookingData.recurrenceParentId,
          customerNotes: bookingData.customerNotes,
          internalNotes: bookingData.internalNotes,
          cleanerNotes: bookingData.cleanerNotes,
          onMyWayAt: bookingData.onMyWayAt ? new Date(bookingData.onMyWayAt) : null,
          arrivedAt: bookingData.arrivedAt ? new Date(bookingData.arrivedAt) : null,
          clockedInAt: bookingData.clockedInAt ? new Date(bookingData.clockedInAt) : null,
          clockedOutAt: bookingData.clockedOutAt ? new Date(bookingData.clockedOutAt) : null,
          completedAt: bookingData.completedAt ? new Date(bookingData.completedAt) : null,
          cancelledAt: bookingData.cancelledAt ? new Date(bookingData.cancelledAt) : null,
          cancellationReason: bookingData.cancellationReason,
          createdAt: new Date(bookingData.createdAt),
          updatedAt: new Date(bookingData.updatedAt),
        },
      });
      results.bookings.created++;
    } catch (error: any) {
      console.error(`  Error creating booking ${bookingData.bookingNumber}: ${error.message}`);
    }
  }
  console.log(`  Created: ${results.bookings.created}, Skipped: ${results.bookings.skipped}`);

  // Import invoices
  console.log('Importing invoices...');
  for (const invData of backup.invoices) {
    const existing = await prisma.invoice.findUnique({
      where: { id: invData.id },
    });
    if (existing) {
      results.invoices.skipped++;
      continue;
    }

    // Check for duplicate invoice number
    const existingByNumber = await prisma.invoice.findUnique({
      where: { invoiceNumber: invData.invoiceNumber },
    });
    if (existingByNumber) {
      results.invoices.skipped++;
      continue;
    }

    try {
      await prisma.invoice.create({
        data: {
          id: invData.id,
          companyId,
          invoiceNumber: invData.invoiceNumber,
          clientId: invData.clientId,
          bookingId: invData.bookingId,
          issueDate: new Date(invData.issueDate),
          dueDate: new Date(invData.dueDate),
          paidDate: invData.paidDate ? new Date(invData.paidDate) : null,
          status: invData.status || 'DRAFT',
          lineItems: invData.lineItems || [],
          subtotal: invData.subtotal || 0,
          discountAmount: invData.discountAmount || 0,
          taxAmount: invData.taxAmount || 0,
          total: invData.total || 0,
          amountPaid: invData.amountPaid || 0,
          amountDue: invData.amountDue || 0,
          notes: invData.notes,
          sentAt: invData.sentAt ? new Date(invData.sentAt) : null,
          viewedAt: invData.viewedAt ? new Date(invData.viewedAt) : null,
          createdAt: new Date(invData.createdAt),
          updatedAt: new Date(invData.updatedAt),
        },
      });
      results.invoices.created++;
    } catch (error: any) {
      console.error(`  Error creating invoice ${invData.invoiceNumber}: ${error.message}`);
    }
  }
  console.log(`  Created: ${results.invoices.created}, Skipped: ${results.invoices.skipped}`);

  // Import payments
  console.log('Importing payments...');
  for (const payData of backup.payments) {
    const existing = await prisma.payment.findUnique({
      where: { id: payData.id },
    });
    if (existing) {
      results.payments.skipped++;
      continue;
    }

    try {
      await prisma.payment.create({
        data: {
          id: payData.id,
          companyId,
          clientId: payData.clientId,
          bookingId: payData.bookingId,
          invoiceId: payData.invoiceId,
          amount: payData.amount || 0,
          method: payData.method || 'CARD',
          status: payData.status || 'PENDING',
          transactionId: payData.transactionId,
          stripePaymentIntentId: payData.stripePaymentIntentId,
          authorizedAt: payData.authorizedAt ? new Date(payData.authorizedAt) : null,
          capturedAt: payData.capturedAt ? new Date(payData.capturedAt) : null,
          notes: payData.notes,
          createdAt: new Date(payData.createdAt),
          updatedAt: new Date(payData.updatedAt),
        },
      });
      results.payments.created++;
    } catch (error: any) {
      console.error(`  Error creating payment: ${error.message}`);
    }
  }
  console.log(`  Created: ${results.payments.created}, Skipped: ${results.payments.skipped}`);

  // Import reviews
  console.log('Importing reviews...');
  for (const revData of backup.reviews) {
    const existing = await prisma.review.findUnique({
      where: { id: revData.id },
    });
    if (existing) {
      results.reviews.skipped++;
      continue;
    }

    // Check if booking exists
    const booking = await prisma.booking.findUnique({ where: { id: revData.bookingId } });
    if (!booking) {
      results.reviews.skipped++;
      continue;
    }

    try {
      await prisma.review.create({
        data: {
          id: revData.id,
          bookingId: revData.bookingId,
          clientId: revData.clientId,
          cleanerId: revData.cleanerId,
          overallRating: revData.overallRating,
          qualityRating: revData.qualityRating,
          punctualityRating: revData.punctualityRating,
          communicationRating: revData.communicationRating,
          title: revData.title,
          comment: revData.comment,
          responseText: revData.responseText,
          respondedAt: revData.respondedAt ? new Date(revData.respondedAt) : null,
          isPublic: revData.isPublic ?? true,
          createdAt: new Date(revData.createdAt),
          updatedAt: new Date(revData.updatedAt),
        },
      });
      results.reviews.created++;
    } catch (error: any) {
      console.error(`  Error creating review: ${error.message}`);
    }
  }
  console.log(`  Created: ${results.reviews.created}, Skipped: ${results.reviews.skipped}`);

  console.log('\n' + '='.repeat(60));
  console.log('IMPORT COMPLETE');
  console.log('='.repeat(60));
  console.log('\nSummary:');
  console.log(`  Users:        ${results.users.created} created, ${results.users.skipped} skipped`);
  console.log(`  Team Members: ${results.teamMembers.created} created, ${results.teamMembers.skipped} skipped`);
  console.log(`  Clients:      ${results.clients.created} created, ${results.clients.skipped} skipped`);
  console.log(`  Addresses:    ${results.addresses.created} created, ${results.addresses.skipped} skipped`);
  console.log(`  Bookings:     ${results.bookings.created} created, ${results.bookings.skipped} skipped`);
  console.log(`  Invoices:     ${results.invoices.created} created, ${results.invoices.skipped} skipped`);
  console.log(`  Payments:     ${results.payments.created} created, ${results.payments.skipped} skipped`);
  console.log(`  Reviews:      ${results.reviews.created} created, ${results.reviews.skipped} skipped`);
}

/**
 * Verify data in the database
 */
async function verifyData() {
  console.log('='.repeat(60));
  console.log('VERIFYING DATABASE DATA');
  console.log('='.repeat(60));

  const company = await prisma.company.findFirst();
  if (!company) {
    console.log('No company found');
    return;
  }

  console.log(`\nCompany: ${company.name} (${company.id})`);

  const companyId = company.id;

  const [
    userCount,
    teamMemberCount,
    clientCount,
    addressCount,
    bookingCount,
    invoiceCount,
    paymentCount,
    reviewCount,
  ] = await Promise.all([
    prisma.user.count({ where: { companyId } }),
    prisma.teamMember.count({ where: { companyId } }),
    prisma.client.count({ where: { companyId } }),
    prisma.address.count({ where: { client: { companyId } } }),
    prisma.booking.count({ where: { companyId } }),
    prisma.invoice.count({ where: { companyId } }),
    prisma.payment.count({ where: { companyId } }),
    prisma.review.count({ where: { booking: { companyId } } }),
  ]);

  // Count 2026 specific data
  const [
    clients2026Count,
    bookings2026Count,
  ] = await Promise.all([
    prisma.client.count({
      where: {
        companyId,
        createdAt: { gte: START_DATE, lte: END_DATE },
      },
    }),
    prisma.booking.count({
      where: {
        companyId,
        client: { createdAt: { gte: START_DATE, lte: END_DATE } },
      },
    }),
  ]);

  console.log('\nTotal Records:');
  console.log(`  Users:        ${userCount}`);
  console.log(`  Team Members: ${teamMemberCount}`);
  console.log(`  Clients:      ${clientCount}`);
  console.log(`  Addresses:    ${addressCount}`);
  console.log(`  Bookings:     ${bookingCount}`);
  console.log(`  Invoices:     ${invoiceCount}`);
  console.log(`  Payments:     ${paymentCount}`);
  console.log(`  Reviews:      ${reviewCount}`);

  console.log('\n2026 Records:');
  console.log(`  Clients (created in 2026):  ${clients2026Count}`);
  console.log(`  Bookings (for 2026 clients): ${bookings2026Count}`);

  // Show recent clients
  console.log('\nRecent 2026 Clients:');
  const recentClients = await prisma.client.findMany({
    where: {
      companyId,
      createdAt: { gte: START_DATE, lte: END_DATE },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true,
    },
  });
  recentClients.forEach(c => {
    console.log(`  - ${c.firstName} ${c.lastName} (${c.phone}) - ${c.createdAt.toLocaleDateString()}`);
  });
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'verify';

  try {
    await prisma.$connect();
    console.log('Connected to database\n');

    switch (command) {
      case 'export':
        await exportData();
        break;
      case 'import':
        await importData();
        break;
      case 'verify':
        await verifyData();
        break;
      default:
        console.log('Usage:');
        console.log('  npx tsx scripts/recover-2026-data.ts export  - Export 2026 data to JSON');
        console.log('  npx tsx scripts/recover-2026-data.ts import  - Import data from JSON');
        console.log('  npx tsx scripts/recover-2026-data.ts verify  - Verify database data');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
