# Feature Verification Checklist

This document helps verify that all new features are properly deployed and functional.

## Recent Features Added

### 1. Cleaner Performance Dashboard ✅
- **Location**: `/cleaner/performance`
- **Navigation**: Sidebar → "Performance" (between "My Jobs" and "Schedule")
- **Features**:
  - Total jobs completed stats
  - Earnings breakdown (this week, month, all-time)
  - Tips tracking
  - Average customer rating
  - Weekly performance trends
  - Recent customer feedback

### 2. Job Checklists ✅
- **Location**: `/cleaner/jobs/[id]/checklist`
- **Access**: "View Checklist" button on each job card in cleaner dashboard
- **Features**:
  - Standard cleaning checklist (28 tasks)
  - Deep cleaning checklist (66 tasks)
  - Move in/out cleaning checklist (101 tasks)
  - Real-time progress tracking
  - Auto-save functionality
  - Expandable categories

### 3. Referral Credit Expiration System ✅
- **Location**: `/referrals`
- **Features**:
  - Credits expire after 180 days
  - FIFO usage (oldest first)
  - Expiring credits warning
  - Transaction audit trail

### 4. Referral Tier System ✅
- **Location**: `/referrals`
- **Features**:
  - Bronze tier (1-4 referrals) - $10 bonus
  - Silver tier (5-9 referrals) - $25 bonus
  - Gold tier (10+ referrals) - $50 bonus
  - Tier progress tracking

### 5. Customer Preference Tracking ✅
- **Location**: `/clients/[id]` (Admin view) and `/cleaner/dashboard` (Cleaner view)
- **Features**:
  - 20+ preference fields across 10 categories
  - Cleaning sequence & priority tracking
  - Product allergies & sensitivities
  - Pet handling & feeding instructions
  - Access & entry codes
  - Communication preferences
  - Temperature preferences
  - Special requests & important notes
  - Prominent display in cleaner dashboard
  - Color-coded sections for easy scanning
  - Critical info highlighting (allergies, codes)

### 6. Customer Self-Service Portal ✅
- **Location**: `/customer/dashboard`, `/customer/preferences`, `/customer/profile`
- **Features**:
  - **Dashboard Enhancements** (`/customer/dashboard`):
    - Personalized welcome greeting with first name
    - New customer onboarding card with feature highlights
    - 6 quick action shortcuts
    - Stats overview (bookings, spending, invoices)
  - **Preference Management** (`/customer/preferences`):
    - Customers manage their own cleaning preferences
    - Full access to all 20+ preference fields
    - Same comprehensive form as admin view
    - Real-time save feedback
    - Organized into 6 categories with icons
  - **Profile Management** (`/customer/profile`):
    - Update contact information (name, email, phone)
    - View all service addresses
    - View account details
    - Simple, user-friendly interface
  - **Quick Actions Available**:
    - View All Bookings → `/customer/bookings`
    - View Invoices → `/customer/invoices`
    - My Preferences → `/customer/preferences`
    - Refer & Earn → `/referrals`
    - My Profile → `/customer/profile`
    - Request New Service (placeholder)
  - **Benefits**:
    - Reduces admin workload (customers manage own data)
    - 24/7 self-service access
    - Professional customer experience
    - Empowers customers to control their service

## Verification Steps

### For Performance Dashboard

1. Log in as a CLEANER user
2. Check sidebar navigation - should see "Performance" link
3. Click "Performance" - should load dashboard
4. Verify all stats cards display correctly
5. Check earnings breakdown section
6. Verify weekly trends chart

### For Job Checklists

1. Log in as a CLEANER user
2. Go to "My Jobs" dashboard
3. Find any job card
4. Click "View Checklist" purple button
5. Verify checklist loads with proper service type
6. Click checkboxes to test completion
7. Verify progress bar updates
8. Check auto-save functionality

### For Referral Features

1. Log in as a CUSTOMER or ADMIN
2. Navigate to "Referrals" page
3. Verify tier progress displays
4. Check for expiring credits warning (if applicable)
5. Verify referral code is displayed
6. Test referral code copy functionality

### For Customer Preference Tracking

**Admin View:**
1. Log in as ADMIN or OWNER
2. Navigate to "Clients" page
3. Click on any client to view details
4. Scroll to "Customer Preferences" section
5. Fill out preference fields (cleaning order, allergies, etc.)
6. Click "Save Preferences"
7. Verify preferences are saved

**Cleaner View:**
1. Log in as CLEANER user
2. Go to "My Jobs" dashboard
3. View today's jobs
4. Check for "⭐ Customer Preferences" section in job card
5. Verify preferences are displayed with proper color coding
6. Check that allergies and alarm codes are prominently highlighted

### For Customer Self-Service Portal

**Dashboard:**
1. Log in as CUSTOMER user
2. Verify personalized greeting shows first name
3. Check stats cards display correctly (bookings, spending, etc.)
4. Verify all 6 quick action buttons are present
5. New customers should see onboarding welcome card

**Preferences:**
1. From dashboard, click "My Preferences" quick action
2. Should load `/customer/preferences` page
3. Fill out various preference fields:
   - Cleaning order
   - Product allergies (test alert styling)
   - Pet instructions
   - Alarm code
   - Special requests
4. Click "Save Preferences"
5. Verify success message appears
6. Refresh page - preferences should persist

**Profile:**
1. From dashboard, click "My Profile" quick action
2. Should load `/customer/profile` page
3. Update name, email, or phone
4. Click "Save Changes"
5. Verify success message
6. Check that addresses are displayed (read-only)

**Integration:**
1. Set preferences as customer
2. Log out and log in as cleaner
3. View a job for that customer
4. Verify preferences appear in cleaner's job card
5. Confirm all fields display correctly

## Common Issues & Solutions

### Issue: "Performance" link not showing in sidebar

**Solutions:**
1. **Hard Refresh Browser**: Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. **Clear Browser Cache**: Clear site data for localhost/your domain
3. **Restart Dev Server**:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```
4. **Rebuild Application**:
   ```bash
   npm run build
   npm run dev
   ```
5. **Check you're logged in as CLEANER role** - Performance only shows for cleaners

### Issue: Theme toggle not visible

**Fixed:** Enhanced theme toggle with explicit dark mode styles
- White background in light mode
- Gray-800 background in dark mode
- Clear text contrast in both modes

**Solutions if still issues:**
1. Hard refresh browser
2. Check browser console for errors
3. Verify ThemeProvider is wrapping the app

### Issue: Checklist not loading

**Solutions:**
1. Verify database migration has been run
2. Check that booking has a valid service type
3. Check browser console for API errors
4. Verify `/api/cleaner/jobs/[id]/checklist` endpoint is accessible

### Issue: Old code showing instead of new features

**Solutions:**
1. **Pull latest changes**:
   ```bash
   git pull origin claude/find-fix-bug-mjz2k6r5trm3iofs-V2gv4
   ```
2. **Regenerate Prisma Client**:
   ```bash
   npx prisma generate
   ```
3. **Rebuild**:
   ```bash
   rm -rf .next
   npm run build
   ```
4. **Restart dev server**:
   ```bash
   npm run dev
   ```

## Database Migrations Required

### For Job Checklists

```sql
-- CreateTable
CREATE TABLE "JobChecklist" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "checklistData" JSONB NOT NULL,
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobChecklist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobChecklist_bookingId_key" ON "JobChecklist"("bookingId");
CREATE INDEX "JobChecklist_bookingId_idx" ON "JobChecklist"("bookingId");

ALTER TABLE "JobChecklist" ADD CONSTRAINT "JobChecklist_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### For Referral Credit Expiration

```sql
-- CreateEnum
CREATE TYPE "ReferralCreditType" AS ENUM ('EARNED', 'USED', 'EXPIRED', 'TIER_BONUS');
CREATE TYPE "ReferralCreditStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED');

-- CreateTable
CREATE TABLE "ReferralCreditTransaction" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "ReferralCreditType" NOT NULL,
    "description" TEXT,
    "expiresAt" TIMESTAMP(3),
    "status" "ReferralCreditStatus" NOT NULL DEFAULT 'ACTIVE',
    "relatedReferralId" TEXT,
    "relatedBookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralCreditTransaction_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "ReferralCreditTransaction_clientId_idx" ON "ReferralCreditTransaction"("clientId");
CREATE INDEX "ReferralCreditTransaction_companyId_idx" ON "ReferralCreditTransaction"("companyId");
CREATE INDEX "ReferralCreditTransaction_status_idx" ON "ReferralCreditTransaction"("status");
CREATE INDEX "ReferralCreditTransaction_expiresAt_idx" ON "ReferralCreditTransaction"("expiresAt");
CREATE INDEX "ReferralCreditTransaction_createdAt_idx" ON "ReferralCreditTransaction"("createdAt");

-- Foreign Key
ALTER TABLE "ReferralCreditTransaction" ADD CONSTRAINT "ReferralCreditTransaction_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### For Customer Preference Tracking

```sql
-- CreateTable
CREATE TABLE "ClientPreference" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "cleaningSequence" TEXT,
    "areasToFocus" TEXT,
    "areasToAvoid" TEXT,
    "productAllergies" TEXT,
    "preferredProducts" TEXT,
    "avoidScents" BOOLEAN NOT NULL DEFAULT false,
    "scentPreferences" TEXT,
    "petHandlingInstructions" TEXT,
    "petFeedingNeeded" BOOLEAN NOT NULL DEFAULT false,
    "petFeedingInstructions" TEXT,
    "preferredContactMethod" TEXT,
    "notificationPreferences" TEXT,
    "languagePreference" TEXT,
    "keyLocation" TEXT,
    "alarmCode" TEXT,
    "entryInstructions" TEXT,
    "specialRequests" TEXT,
    "thingsToKnow" TEXT,
    "temperaturePreferences" TEXT,
    "lastVisitNotes" TEXT,
    "lastVisitDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientPreference_clientId_key" ON "ClientPreference"("clientId");

-- CreateIndex
CREATE INDEX "ClientPreference_clientId_idx" ON "ClientPreference"("clientId");

-- AddForeignKey
ALTER TABLE "ClientPreference" ADD CONSTRAINT "ClientPreference_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## Quick Test Commands

```bash
# Check build status
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Verify Prisma schema
npx prisma validate

# Generate Prisma client
npx prisma generate

# Start dev server
npm run dev
```

## Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Performance Dashboard | ✅ Completed | Committed in dd11b3f |
| Job Checklists | ✅ Completed | Committed in 8f0bc20 |
| Credit Expiration | ✅ Completed | Committed in 03340b2 |
| Referral Tiers | ✅ Completed | Committed in 84383b1 |
| Theme Toggle Fix | ✅ Completed | Improved visibility |
| Customer Preferences | ✅ Completed | Committed in 358065b |
| Customer Self-Service Portal | ✅ Completed | Committed in c0c98df |

## Contact

If issues persist after trying all solutions above:
1. Check browser console for errors (F12)
2. Check terminal/server logs for errors
3. Verify you're on the correct branch
4. Ensure all environment variables are set
5. Try in a different browser (incognito mode)

---

Last Updated: 2024-01-14
Branch: claude/find-fix-bug-mjz2k6r5trm3iofs-V2gv4
