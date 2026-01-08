# Database Migration: Add Review URLs to Company

This migration adds `yelpReviewUrl` field to the Company table to support automated review requests feature.

## Schema Changes

The following field has been added to the `Company` model in `prisma/schema.prisma`:

```prisma
model Company {
  // ... existing fields

  // Customer Links & Payment Info
  googleReviewUrl       String?             // Google Business review link
  yelpReviewUrl         String?             // Yelp Business review link (NEW)
  zelleEmail            String?             // Zelle payment email
  venmoUsername         String?             // Venmo @username
  cashappUsername       String?             // CashApp $username

  // ... other fields
}
```

## Migration Instructions

### Step 1: Generate Migration File

Run the following command to create a new migration:

```bash
npx prisma migrate dev --name add_yelp_review_url
```

This will:
- Create a new migration file in `prisma/migrations/`
- Apply the migration to your development database
- Regenerate the Prisma Client

### Step 2: Review Migration SQL

The generated migration should contain SQL similar to:

```sql
-- AlterTable
ALTER TABLE "Company" ADD COLUMN "yelpReviewUrl" TEXT;
```

### Step 3: Apply to Production

When ready to deploy to production, run:

```bash
npx prisma migrate deploy
```

Or if using Vercel/Netlify, the migration will be applied automatically during deployment if you have the build command set up correctly.

## Alternative: Manual SQL Migration

If you prefer to run the SQL directly on your database:

```sql
-- Add yelpReviewUrl column to Company table
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "yelpReviewUrl" TEXT;
```

After running manual SQL, regenerate Prisma Client:

```bash
npx prisma generate
```

## Verification

After migration, verify the schema is correct:

```bash
npx prisma studio
```

Navigate to the Company table and confirm the `yelpReviewUrl` field exists.

## Rollback (if needed)

If you need to rollback this change:

```sql
ALTER TABLE "Company" DROP COLUMN "yelpReviewUrl";
```

## Features Enabled by This Migration

- **Settings Page**: Company owners can now configure their Yelp review URL
- **Feedback Page**: Customers see both Google and Yelp review buttons (when configured)
- **Automated Review Requests**: Cron job sends feedback requests 24 hours after job completion

## Related Files

- Schema: `prisma/schema.prisma`
- Settings Page: `src/app/(dashboard)/settings/page.tsx`
- Feedback Page: `src/app/(public)/feedback/[token]/page.tsx`
- API Route: `src/app/api/company/settings/route.ts`
- Cron Job: `src/app/api/cron/send-feedback-requests/route.ts`

## Notes

- The `yelpReviewUrl` field is optional (nullable)
- Both Google and Yelp URLs can be configured independently
- If only one review URL is configured, only that button will be displayed
- Review buttons use brand-specific colors and icons for better UX
