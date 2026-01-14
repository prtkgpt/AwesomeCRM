# Stripe Account Migration Guide
## BookingKoala → CleanDay CRM

### Current State Analysis

#### CleanDay CRM Stripe Integration
Your current implementation stores:

**Client Model:**
- `stripeCustomerId` - Links to Stripe Customer
- `stripePaymentMethodId` - Saved payment method
- `autoChargeEnabled` - Auto-charge permission flag

**Booking Model:**
- `stripePaymentIntentId` - Main payment tracking
- `copayStripePaymentIntentId` - Copay payment tracking
- `stripePaymentLink` - Payment link URLs
- Payment status fields (isPaid, paidAt, paymentMethod)

---

## Migration Challenges

### Key Limitations
1. **Stripe doesn't support cross-account transfers** - You cannot move data between Stripe accounts
2. **Payment history is immutable** - Historical charges cannot be moved
3. **Payment methods are non-transferable** - Customers must re-enter cards
4. **Different account IDs** - All Stripe IDs will change (customer IDs, payment intent IDs, etc.)

---

## Recommended Migration Strategy

### **Option 1: Clean Cutover with Historical Reference (RECOMMENDED)**

This approach balances data preservation with a clean fresh start.

#### Phase 1: Pre-Migration Data Export (1-2 days)
```bash
# Export from BookingKoala Stripe account:
1. Customer list with metadata
2. Payment history (last 12 months minimum)
3. Active payment methods (metadata only)
4. Subscription data (if any)
```

**What to export:**
- Customer IDs and email addresses
- Payment intent IDs and amounts
- Payment dates and status
- Any custom metadata
- Subscription status and billing cycles

#### Phase 2: Database Schema Enhancement
Add fields to track old Stripe data:

```prisma
model Client {
  // ... existing fields ...

  // Migration tracking
  legacyStripeCustomerId     String?  // Old BookingKoala Stripe ID
  migratedAt                 DateTime? // When migrated to new account

  // ... existing fields ...
}

model Booking {
  // ... existing fields ...

  // Migration tracking
  legacyStripePaymentIntentId String? // Old BookingKoala payment ID
  legacyPaymentData           Json?   // Store historical payment details

  // ... existing fields ...
}

// New model for historical payment reference
model LegacyPaymentRecord {
  id                    String   @id @default(cuid())
  companyId             String
  clientId              String
  bookingId             String?

  // BookingKoala Stripe data
  oldStripeCustomerId   String
  oldStripePaymentId    String
  amount                Float
  status                String
  paidAt                DateTime
  paymentMethod         String
  metadata              Json?

  // Link to new system
  migratedToBookingId   String?

  createdAt             DateTime @default(now())

  @@index([companyId])
  @@index([clientId])
  @@index([oldStripeCustomerId])
  @@index([oldStripePaymentId])
}
```

#### Phase 3: Import Historical Data
Create a migration script:

```typescript
// scripts/migrate-stripe-data.ts

import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const oldStripe = new Stripe(process.env.OLD_STRIPE_SECRET_KEY!);
const newStripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function migrateCustomerData() {
  // 1. Export all customers from old Stripe
  const oldCustomers = await oldStripe.customers.list({ limit: 100 });

  // 2. Match with CleanDay CRM clients by email
  for (const oldCustomer of oldCustomers.data) {
    const client = await prisma.client.findFirst({
      where: { email: oldCustomer.email }
    });

    if (client) {
      // 3. Store old Stripe ID for reference
      await prisma.client.update({
        where: { id: client.id },
        data: {
          legacyStripeCustomerId: oldCustomer.id,
          migratedAt: new Date()
        }
      });

      // 4. Create new Stripe customer (fresh start)
      const newCustomer = await newStripe.customers.create({
        email: oldCustomer.email,
        name: oldCustomer.name || client.name,
        metadata: {
          cleandaycrm_client_id: client.id,
          migrated_from: oldCustomer.id,
          migration_date: new Date().toISOString()
        }
      });

      // 5. Link new Stripe customer
      await prisma.client.update({
        where: { id: client.id },
        data: {
          stripeCustomerId: newCustomer.id
        }
      });
    }
  }
}

async function importPaymentHistory() {
  // 1. Export payment intents from old Stripe
  const payments = await oldStripe.paymentIntents.list({
    limit: 100,
    // Get last 12 months
    created: { gte: Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60) }
  });

  // 2. Store as historical records
  for (const payment of payments.data) {
    const client = await prisma.client.findFirst({
      where: { legacyStripeCustomerId: payment.customer as string }
    });

    if (client) {
      await prisma.legacyPaymentRecord.create({
        data: {
          companyId: client.companyId,
          clientId: client.id,
          oldStripeCustomerId: payment.customer as string,
          oldStripePaymentId: payment.id,
          amount: payment.amount / 100, // Convert from cents
          status: payment.status,
          paidAt: new Date(payment.created * 1000),
          paymentMethod: payment.payment_method_types[0],
          metadata: payment.metadata as any
        }
      });
    }
  }
}
```

#### Phase 4: Customer Communication
**Email template for customers:**

```
Subject: Important: Update Your Payment Information

Hi [Customer Name],

We're excited to announce that we've migrated to our own dedicated platform,
CleanDay CRM! This will allow us to serve you better with improved features.

ACTION REQUIRED:
For security reasons, you'll need to re-enter your payment method the next
time you book a service. Your payment history and booking details are
preserved and accessible in your account.

What stays the same:
✓ Your booking history
✓ Your contact information
✓ Your service preferences
✓ Your referral credits

What you need to do:
→ Next booking: Re-enter your card details (one time)
→ Optional: Enable auto-charge for convenience

Questions? Reply to this email or call us at [phone].

Thank you for being a valued customer!
```

#### Phase 5: Go-Live Checklist

**Pre-Launch (1 week before):**
- [ ] Run migration script in test environment
- [ ] Verify all customer data migrated correctly
- [ ] Test new Stripe account with test transactions
- [ ] Update environment variables (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY)
- [ ] Configure Stripe webhooks for new account
- [ ] Train team on new process

**Launch Day:**
- [ ] Switch Stripe API keys to new account
- [ ] Disable old Stripe account webhooks
- [ ] Enable new Stripe account webhooks
- [ ] Monitor first few transactions closely
- [ ] Send customer communication email

**Post-Launch (1 week after):**
- [ ] Keep old Stripe account in read-only mode (6 months)
- [ ] Monitor error rates and customer support tickets
- [ ] Track payment method re-entry rate
- [ ] Generate reconciliation report

---

### **Option 2: Gradual Migration**

If you want to minimize disruption:

#### Approach:
1. **Dual Operation** (2-4 weeks)
   - Keep both Stripe accounts active
   - New customers → new Stripe account
   - Existing customers → old Stripe account (until next booking)

2. **Automatic Migration on Booking**
   - When existing customer books, create new Stripe customer
   - Ask them to re-enter payment method
   - Migrate historical data to LegacyPaymentRecord

3. **Grace Period**
   - Allow 60-90 days for natural migration
   - Reach out to inactive customers after 60 days
   - Force migration for remaining customers

---

### **Option 3: Hybrid Approach with Stripe Connect**

If you want to maintain access to BookingKoala payments:

#### Use Case:
If you still need to process refunds or view old transactions.

#### Implementation:
1. Keep old account as "Connected Account"
2. New account becomes primary
3. Access old data via Stripe Connect APIs
4. Process all new payments through new account

**Note:** This is more complex and may not be necessary for most cases.

---

## Database Migration Script

### Step 1: Add Migration Fields

```bash
# Create migration file
npx prisma migrate dev --name add_stripe_migration_fields
```

```prisma
// In schema.prisma, add to Client model:
model Client {
  // ... existing fields ...

  legacyStripeCustomerId  String?
  migratedAt              DateTime?

  // ... rest of model ...
}

// Add to Booking model:
model Booking {
  // ... existing fields ...

  legacyStripePaymentIntentId String?
  legacyPaymentData           Json?

  // ... rest of model ...
}

// Add new model:
model LegacyPaymentRecord {
  id                    String   @id @default(cuid())
  companyId             String
  company               Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  clientId              String
  client                Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  bookingId             String?
  booking               Booking? @relation(fields: [bookingId], references: [id])

  oldStripeCustomerId   String
  oldStripePaymentId    String   @unique
  amount                Float
  status                String
  paidAt                DateTime
  paymentMethod         String
  metadata              Json?

  migratedToBookingId   String?

  createdAt             DateTime @default(now())

  @@index([companyId])
  @@index([clientId])
  @@index([oldStripeCustomerId])
  @@index([oldStripePaymentId])
}
```

### Step 2: Create Migration Script

Create `/home/user/AwesomeCRM/scripts/migrate-stripe-data.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Initialize both Stripe instances
const oldStripe = new Stripe(process.env.OLD_STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const newStripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

async function migrateStripeData() {
  console.log('🚀 Starting Stripe migration...\n');

  // Step 1: Migrate customers
  console.log('📋 Step 1: Migrating customers...');
  await migrateCustomers();

  // Step 2: Import payment history
  console.log('\n💳 Step 2: Importing payment history...');
  await importPaymentHistory();

  // Step 3: Generate report
  console.log('\n📊 Step 3: Generating migration report...');
  await generateReport();

  console.log('\n✅ Migration complete!');
}

async function migrateCustomers() {
  let hasMore = true;
  let startingAfter: string | undefined;
  let migratedCount = 0;
  let skippedCount = 0;

  while (hasMore) {
    const oldCustomers = await oldStripe.customers.list({
      limit: 100,
      starting_after: startingAfter,
    });

    for (const oldCustomer of oldCustomers.data) {
      try {
        // Find matching client by email
        const client = await prisma.client.findFirst({
          where: {
            email: oldCustomer.email || undefined
          },
        });

        if (!client) {
          console.log(`⚠️  No matching client for Stripe customer: ${oldCustomer.id} (${oldCustomer.email})`);
          skippedCount++;
          continue;
        }

        // Store legacy ID
        await prisma.client.update({
          where: { id: client.id },
          data: {
            legacyStripeCustomerId: oldCustomer.id,
          },
        });

        // Create new Stripe customer
        const newCustomer = await newStripe.customers.create({
          email: oldCustomer.email || undefined,
          name: oldCustomer.name || client.name,
          phone: oldCustomer.phone || client.phone || undefined,
          metadata: {
            cleandaycrm_client_id: client.id,
            migrated_from: oldCustomer.id,
            migration_date: new Date().toISOString(),
          },
        });

        // Link new Stripe customer
        await prisma.client.update({
          where: { id: client.id },
          data: {
            stripeCustomerId: newCustomer.id,
            migratedAt: new Date(),
          },
        });

        console.log(`✓ Migrated: ${client.name} (${client.email})`);
        migratedCount++;
      } catch (error) {
        console.error(`❌ Error migrating customer ${oldCustomer.id}:`, error);
      }
    }

    hasMore = oldCustomers.has_more;
    if (hasMore) {
      startingAfter = oldCustomers.data[oldCustomers.data.length - 1].id;
    }
  }

  console.log(`\n   Migrated: ${migratedCount} customers`);
  console.log(`   Skipped: ${skippedCount} customers (no match)`);
}

async function importPaymentHistory() {
  let hasMore = true;
  let startingAfter: string | undefined;
  let importedCount = 0;

  // Get payments from last 24 months
  const cutoffDate = Math.floor(Date.now() / 1000) - (730 * 24 * 60 * 60);

  while (hasMore) {
    const payments = await oldStripe.paymentIntents.list({
      limit: 100,
      created: { gte: cutoffDate },
      starting_after: startingAfter,
    });

    for (const payment of payments.data) {
      try {
        // Only import successful payments
        if (payment.status !== 'succeeded') continue;

        // Find client by legacy Stripe ID
        const client = await prisma.client.findFirst({
          where: {
            legacyStripeCustomerId: payment.customer as string
          },
        });

        if (!client) continue;

        // Create legacy payment record
        await prisma.legacyPaymentRecord.create({
          data: {
            companyId: client.companyId,
            clientId: client.id,
            oldStripeCustomerId: payment.customer as string,
            oldStripePaymentId: payment.id,
            amount: payment.amount / 100,
            status: payment.status,
            paidAt: new Date(payment.created * 1000),
            paymentMethod: payment.payment_method_types[0] || 'card',
            metadata: payment.metadata as any,
          },
        });

        importedCount++;

        if (importedCount % 50 === 0) {
          console.log(`   Imported ${importedCount} payment records...`);
        }
      } catch (error: any) {
        // Skip duplicates
        if (!error.message?.includes('Unique constraint')) {
          console.error(`❌ Error importing payment ${payment.id}:`, error);
        }
      }
    }

    hasMore = payments.has_more;
    if (hasMore) {
      startingAfter = payments.data[payments.data.length - 1].id;
    }
  }

  console.log(`\n   Imported: ${importedCount} payment records`);
}

async function generateReport() {
  const totalClients = await prisma.client.count();
  const migratedClients = await prisma.client.count({
    where: { migratedAt: { not: null } },
  });
  const legacyPayments = await prisma.legacyPaymentRecord.count();
  const totalRevenue = await prisma.legacyPaymentRecord.aggregate({
    _sum: { amount: true },
  });

  console.log('\n📊 Migration Report:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total Clients:           ${totalClients}`);
  console.log(`Migrated Clients:        ${migratedClients}`);
  console.log(`Migration Rate:          ${((migratedClients / totalClients) * 100).toFixed(1)}%`);
  console.log(`Legacy Payment Records:  ${legacyPayments}`);
  console.log(`Historical Revenue:      $${(totalRevenue._sum.amount || 0).toFixed(2)}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run migration
migrateStripeData()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Step 3: Run Migration

```bash
# 1. Add old Stripe key to .env
echo "OLD_STRIPE_SECRET_KEY=sk_live_..." >> .env

# 2. Install dependencies (if needed)
npm install dotenv

# 3. Run migration script
npx ts-node scripts/migrate-stripe-data.ts
```

---

## Webhook Configuration

### Update Stripe Webhooks

1. **Old Account** (BookingKoala):
   - Disable all webhooks
   - Or update URLs to return 200 OK without processing

2. **New Account** (CleanDay CRM):
   - Set webhook URL: `https://yourdomain.com/api/webhooks/stripe/[companyId]`
   - Enable events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `customer.updated`
     - `customer.deleted`
     - `payment_method.attached`
     - `payment_method.detached`

---

## Post-Migration Considerations

### Customer Experience
- **Payment method re-entry**: Inevitable, but communicates security
- **Auto-charge re-enablement**: Customers need to opt-in again
- **Payment links**: Old links will break, need regeneration

### Financial Reconciliation
- Export final statement from old Stripe account
- Keep old account accessible for 6-12 months (refunds, disputes)
- Create reconciliation report matching old → new customer IDs

### Support Team Training
- How to look up legacy payments
- How to handle customer questions about payment history
- Process for regenerating payment links

---

## Timeline Estimate

### Conservative Approach (Recommended)
- **Week 1**: Schema updates + migration script development
- **Week 2**: Test migration with subset of data
- **Week 3**: Customer communication + full migration
- **Week 4**: Monitor and support

### Aggressive Approach
- **Days 1-2**: Schema + script
- **Days 3-4**: Full migration
- **Days 5-7**: Monitor and support

---

## Risk Mitigation

### Backup Strategy
1. Export all Stripe data before migration
2. Database backup before schema changes
3. Keep old Stripe account active (read-only)

### Rollback Plan
If critical issues arise:
1. Revert environment variables to old Stripe keys
2. Re-enable old webhooks
3. Database rollback if schema issues
4. Customer communication about temporary issue

### Success Metrics
- Migration completion rate > 95%
- Customer support tickets < 5% of customer base
- Payment success rate maintained or improved
- Zero payment processing downtime

---

## Next Steps

1. **Choose migration strategy** (Option 1 recommended)
2. **Schedule migration date** (consider booking volume)
3. **Test in staging environment first**
4. **Prepare customer communication**
5. **Brief support team**
6. **Execute migration**
7. **Monitor for 2 weeks post-migration**

---

## Questions to Answer Before Starting

- [ ] What's your current monthly booking volume?
- [ ] How many active customers with saved payment methods?
- [ ] Any active subscriptions in BookingKoala Stripe?
- [ ] Need to process refunds from old account?
- [ ] Customer base tech-savvy or need extra support?
- [ ] Preferred migration date (low booking volume day)?
- [ ] Support team availability during migration?

---

## Need Help?

This is a complex migration. Consider:
- Testing in staging environment first
- Migrating during low-volume period
- Having customer support team on standby
- Phased rollout (10% → 50% → 100%)
