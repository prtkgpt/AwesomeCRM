import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface BackupData {
  clients: any[];
  bookings: any[];
  invoices: any[];
  teamMembers: any[];
  addresses: any[];
  messages: any[];
  messageTemplates: any[];
  pricingRules: any[];
  cleaningReviews: any[];
  exportedAt: string;
}

// POST /api/admin/backups/[id]/restore - Restore from a backup
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, companyId: true, role: true },
    });

    if (!user || user.role !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: 'Only company owners can restore backups' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { mode = 'merge' } = body; // 'merge' (default) or 'replace'

    const backup = await prisma.companyBackup.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
        status: 'ACTIVE',
      },
    });

    if (!backup) {
      return NextResponse.json(
        { success: false, error: 'Backup not found or not available for restore' },
        { status: 404 }
      );
    }

    // Mark backup as restoring
    await prisma.companyBackup.update({
      where: { id: params.id },
      data: { status: 'RESTORING' },
    });

    const companyId = user.companyId;
    const backupData = backup.data as BackupData;

    // Track restoration results
    const results = {
      clients: { restored: 0, skipped: 0, errors: [] as string[] },
      addresses: { restored: 0, skipped: 0, errors: [] as string[] },
      bookings: { restored: 0, skipped: 0, errors: [] as string[] },
      invoices: { restored: 0, skipped: 0, errors: [] as string[] },
      teamMembers: { restored: 0, skipped: 0, errors: [] as string[] },
      pricingRules: { restored: 0, skipped: 0, errors: [] as string[] },
    };

    try {
      // If replace mode, create a backup of current data first
      if (mode === 'replace') {
        console.log('Replace mode: Creating auto-backup of current data...');

        // Fetch current data for auto-backup
        const [currentClients, currentBookings, currentInvoices] = await Promise.all([
          prisma.client.findMany({ where: { companyId }, include: { addresses: true, preferences: true } }),
          prisma.booking.findMany({ where: { companyId } }),
          prisma.invoice.findMany({ where: { companyId } }),
        ]);

        // Create auto-backup
        await prisma.companyBackup.create({
          data: {
            companyId,
            name: `Auto-backup before restore (${new Date().toISOString()})`,
            description: `Automatic backup created before restoring from "${backup.name}"`,
            version: '1.0',
            data: {
              clients: currentClients,
              bookings: currentBookings,
              invoices: currentInvoices,
              exportedAt: new Date().toISOString(),
            },
            clientsCount: currentClients.length,
            bookingsCount: currentBookings.length,
            invoicesCount: currentInvoices.length,
            teamMembersCount: 0,
            sizeBytes: 0,
            createdById: user.id,
            status: 'ACTIVE',
          },
        });
      }

      // STEP 1: Restore Clients
      console.log(`Restoring ${backupData.clients?.length || 0} clients...`);
      for (const client of backupData.clients || []) {
        try {
          // Check if client already exists
          const existingById = await prisma.client.findUnique({
            where: { id: client.id },
          });

          if (existingById) {
            if (mode === 'replace') {
              // Update existing client
              await prisma.client.update({
                where: { id: client.id },
                data: {
                  name: client.name,
                  email: client.email,
                  phone: client.phone,
                  notes: client.notes,
                  tags: client.tags || [],
                  hasInsurance: client.hasInsurance,
                  insuranceProvider: client.insuranceProvider,
                  referralCreditsBalance: client.referralCreditsBalance,
                },
              });
              results.clients.restored++;
            } else {
              results.clients.skipped++;
            }
            continue;
          }

          // Check by phone/email to avoid duplicates
          const existingByContact = await prisma.client.findFirst({
            where: {
              companyId,
              OR: [
                client.phone ? { phone: client.phone } : {},
                client.email ? { email: client.email } : {},
              ].filter(o => Object.keys(o).length > 0),
            },
          });

          if (existingByContact) {
            results.clients.skipped++;
            continue;
          }

          // Create client
          await prisma.client.create({
            data: {
              id: client.id,
              companyId,
              userId: user.id,
              name: client.name,
              email: client.email || null,
              phone: client.phone || null,
              notes: client.notes || null,
              tags: client.tags || [],
              hasInsurance: client.hasInsurance || false,
              insuranceProvider: client.insuranceProvider || null,
              helperBeesReferralId: client.helperBeesReferralId || null,
              referralCreditsBalance: client.referralCreditsBalance || 0,
              createdAt: new Date(client.createdAt),
              updatedAt: new Date(client.updatedAt),
            },
          });
          results.clients.restored++;

          // Restore addresses for this client
          const clientAddresses = client.addresses || [];
          for (const address of clientAddresses) {
            try {
              const existingAddress = await prisma.address.findUnique({
                where: { id: address.id },
              });

              if (existingAddress) {
                results.addresses.skipped++;
                continue;
              }

              await prisma.address.create({
                data: {
                  id: address.id,
                  clientId: client.id,
                  label: address.label || null,
                  street: address.street,
                  city: address.city,
                  state: address.state,
                  zip: address.zip,
                  parkingInfo: address.parkingInfo || null,
                  gateCode: address.gateCode || null,
                  petInfo: address.petInfo || null,
                  preferences: address.preferences || null,
                  googlePlaceId: address.googlePlaceId || null,
                  lat: address.lat || null,
                  lng: address.lng || null,
                  isVerified: address.isVerified || false,
                  propertyType: address.propertyType || null,
                  squareFootage: address.squareFootage || null,
                  bedrooms: address.bedrooms || null,
                  bathrooms: address.bathrooms || null,
                },
              });
              results.addresses.restored++;
            } catch (addrError: any) {
              results.addresses.errors.push(`${address.street}: ${addrError.message}`);
            }
          }
        } catch (clientError: any) {
          results.clients.errors.push(`${client.name}: ${clientError.message}`);
        }
      }

      // STEP 2: Restore Bookings
      console.log(`Restoring ${backupData.bookings?.length || 0} bookings...`);
      for (const booking of backupData.bookings || []) {
        try {
          const existingBooking = await prisma.booking.findUnique({
            where: { id: booking.id },
          });

          if (existingBooking) {
            if (mode === 'replace') {
              await prisma.booking.update({
                where: { id: booking.id },
                data: {
                  scheduledDate: new Date(booking.scheduledDate),
                  duration: booking.duration,
                  serviceType: booking.serviceType,
                  status: booking.status,
                  price: booking.price,
                  isPaid: booking.isPaid,
                  paymentMethod: booking.paymentMethod,
                  notes: booking.notes,
                  internalNotes: booking.internalNotes,
                },
              });
              results.bookings.restored++;
            } else {
              results.bookings.skipped++;
            }
            continue;
          }

          // Verify client and address exist
          const clientExists = await prisma.client.findUnique({
            where: { id: booking.clientId },
          });
          const addressExists = await prisma.address.findUnique({
            where: { id: booking.addressId },
          });

          if (!clientExists || !addressExists) {
            results.bookings.skipped++;
            continue;
          }

          await prisma.booking.create({
            data: {
              id: booking.id,
              companyId,
              userId: user.id,
              clientId: booking.clientId,
              addressId: booking.addressId,
              scheduledDate: new Date(booking.scheduledDate),
              duration: booking.duration,
              serviceType: booking.serviceType,
              status: booking.status,
              price: booking.price,
              isPaid: booking.isPaid || false,
              paymentMethod: booking.paymentMethod || null,
              notes: booking.notes || null,
              internalNotes: booking.internalNotes || null,
              isRecurring: booking.isRecurring || false,
              recurrenceFrequency: booking.recurrenceFrequency || 'NONE',
              createdAt: new Date(booking.createdAt),
              updatedAt: new Date(booking.updatedAt),
            },
          });
          results.bookings.restored++;
        } catch (bookingError: any) {
          results.bookings.errors.push(`Booking ${booking.id}: ${bookingError.message}`);
        }
      }

      // STEP 3: Restore Invoices
      console.log(`Restoring ${backupData.invoices?.length || 0} invoices...`);
      for (const invoice of backupData.invoices || []) {
        try {
          const existingInvoice = await prisma.invoice.findUnique({
            where: { id: invoice.id },
          });

          if (existingInvoice) {
            results.invoices.skipped++;
            continue;
          }

          // Verify client exists
          const clientExists = await prisma.client.findUnique({
            where: { id: invoice.clientId },
          });

          if (!clientExists) {
            results.invoices.skipped++;
            continue;
          }

          await prisma.invoice.create({
            data: {
              id: invoice.id,
              companyId,
              userId: user.id,
              clientId: invoice.clientId,
              bookingId: invoice.bookingId || null,
              invoiceNumber: invoice.invoiceNumber,
              issueDate: new Date(invoice.issueDate),
              dueDate: new Date(invoice.dueDate),
              status: invoice.status,
              lineItems: invoice.lineItems,
              subtotal: invoice.subtotal,
              tax: invoice.tax || 0,
              total: invoice.total,
              notes: invoice.notes || null,
              terms: invoice.terms || null,
            },
          });
          results.invoices.restored++;
        } catch (invoiceError: any) {
          results.invoices.errors.push(`Invoice ${invoice.invoiceNumber}: ${invoiceError.message}`);
        }
      }

      // Mark backup as active again
      await prisma.companyBackup.update({
        where: { id: params.id },
        data: { status: 'ACTIVE' },
      });

      console.log('Restore completed:', results);

      return NextResponse.json({
        success: true,
        message: 'Backup restored successfully',
        mode,
        results: {
          clients: {
            restored: results.clients.restored,
            skipped: results.clients.skipped,
            errors: results.clients.errors.slice(0, 10),
          },
          addresses: {
            restored: results.addresses.restored,
            skipped: results.addresses.skipped,
            errors: results.addresses.errors.slice(0, 10),
          },
          bookings: {
            restored: results.bookings.restored,
            skipped: results.bookings.skipped,
            errors: results.bookings.errors.slice(0, 10),
          },
          invoices: {
            restored: results.invoices.restored,
            skipped: results.invoices.skipped,
            errors: results.invoices.errors.slice(0, 10),
          },
        },
      });
    } catch (restoreError) {
      // Mark backup as active again on error
      await prisma.companyBackup.update({
        where: { id: params.id },
        data: { status: 'ACTIVE' },
      });
      throw restoreError;
    }
  } catch (error) {
    console.error('Restore backup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to restore backup' },
      { status: 500 }
    );
  }
}
