# CleanerCRM

A simple, fast, mobile-first CRM built specifically for independent home cleaners. Get started in under 10 minutes.

**Core Features:** Calendar + Clients + Payments + Reminders — nothing more, nothing less.

## Product Overview

CleanerCRM is designed for solo home cleaners (with occasional helpers) who book clients via text/calls/Instagram and want better organization and payment collection. This is an operating system for one person, not a full business suite.

### What It Does

- Manage clients with multiple addresses and notes (parking, gate codes, pets, preferences)
- Schedule jobs in under 30 seconds with recurring support (weekly, biweekly, monthly)
- View jobs in a mobile-friendly calendar (day view)
- Request payments via Stripe or mark as paid (cash/check/zelle)
- Send automated SMS reminders and confirmations via Twilio
- Track revenue, completed jobs, and unpaid amounts

### What It Doesn't Do

- No employee payroll or team management (yet)
- No route optimization
- No inventory or supply tracking
- No complex quote builder
- No multi-location dispatch board

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js with credentials provider
- **Payments:** Stripe Checkout
- **Messaging:** Twilio SMS
- **Deployment:** Vercel (recommended)

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database (local or hosted)
- Stripe account (free test mode)
- Twilio account (optional for SMS features)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd AwesomeCRM
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your environment variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/cleanercrm?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-generate-with-openssl-rand-base64-32"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Twilio
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1234567890"

# Cron Secret (generate random string)
CRON_SECRET="your-random-secret-for-cron-jobs"
```

### 3. Set Up Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` and create your account!

---

## Environment Variables Explained

### Database

- `DATABASE_URL`: PostgreSQL connection string
  - **Local:** `postgresql://user:password@localhost:5432/cleanercrm`
  - **Vercel Postgres:** Auto-configured when you add Vercel Postgres
  - **Railway/Supabase:** Use their provided connection string

### NextAuth

- `NEXTAUTH_URL`: Your app URL
  - **Local:** `http://localhost:3000`
  - **Production:** `https://your-domain.com`
- `NEXTAUTH_SECRET`: Random secret for JWT encryption
  - Generate: `openssl rand -base64 32`

### Stripe

Get your keys from [Stripe Dashboard](https://dashboard.stripe.com/apikeys):

- `STRIPE_SECRET_KEY`: Server-side key (starts with `sk_test_` or `sk_live_`)
- `STRIPE_PUBLISHABLE_KEY`: Client-side key (starts with `pk_test_` or `pk_live_`)
- `STRIPE_WEBHOOK_SECRET`: From Stripe Webhooks settings (starts with `whsec_`)

**Setting up Stripe Webhook:**
1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-domain.com/api/payments/webhook`
3. Select events: `payment_intent.succeeded`, `checkout.session.completed`
4. Copy the webhook secret

### Twilio

Get credentials from [Twilio Console](https://console.twilio.com):

- `TWILIO_ACCOUNT_SID`: Your Account SID
- `TWILIO_AUTH_TOKEN`: Your Auth Token
- `TWILIO_PHONE_NUMBER`: Your Twilio phone number (with country code, e.g., `+15551234567`)

**Note:** Twilio is optional. SMS features will be disabled if not configured.

### Cron Secret

- `CRON_SECRET`: Random string to protect cron endpoints
  - Generate: `openssl rand -base64 32`
  - Used to authenticate Vercel Cron requests

---

## Deployment to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and import your repository
2. Vercel will auto-detect Next.js
3. Add all environment variables from `.env.local`
4. Click "Deploy"

### 3. Set Up Database

**Option A: Vercel Postgres (Recommended)**
1. In Vercel project settings, go to "Storage"
2. Create new Postgres database
3. Vercel will automatically set `DATABASE_URL`
4. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

**Option B: External Database (Railway, Supabase, etc.)**
1. Create database on your provider
2. Add `DATABASE_URL` to Vercel environment variables
3. Run migrations as above

### 4. Configure Webhooks

**Stripe:**
- Add production webhook endpoint: `https://your-domain.vercel.app/api/payments/webhook`
- Update `STRIPE_WEBHOOK_SECRET` in Vercel

**Twilio (Optional):**
- Add SMS status callback: `https://your-domain.vercel.app/api/messages/webhook`

### 5. Verify Cron Jobs

Vercel Cron is configured in `vercel.json` to run reminders every hour:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

You can test manually:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.vercel.app/api/cron/reminders
```

---

## Database Schema

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete schema documentation.

**Key models:**
- `User` - Account with auth credentials
- `Client` - Customer with tags and Stripe ID
- `Address` - Client addresses with cleaner-specific notes
- `Booking` - Jobs with recurring support
- `Message` - SMS log with Twilio integration
- `MessageTemplate` - Customizable message templates

---

## API Routes

All API routes return JSON with this format:

```typescript
{
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}
```

### Authentication

- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Sign in (NextAuth)
- `POST /api/auth/signout` - Sign out

### Clients

- `GET /api/clients` - List all clients (with search/filter)
- `POST /api/clients` - Create client with addresses
- `GET /api/clients/[id]` - Get client details
- `PUT /api/clients/[id]` - Update client
- `DELETE /api/clients/[id]` - Delete client

### Bookings

- `GET /api/bookings` - List bookings (with filters)
- `POST /api/bookings` - Create booking (+ recurring instances)
- `GET /api/bookings/[id]` - Get booking details
- `PUT /api/bookings/[id]` - Update booking
- `DELETE /api/bookings/[id]` - Delete booking

### Calendar

- `GET /api/calendar?date=2024-01-15&view=day` - Get calendar with conflicts

### Payments

- `POST /api/payments/create-link` - Generate Stripe payment link
- `POST /api/payments/mark-paid` - Mark as paid (cash/check/zelle)
- `POST /api/payments/webhook` - Stripe webhook handler

### Messages

- `POST /api/messages/send` - Send SMS via Twilio
- `GET /api/messages/templates` - Get all templates
- `PUT /api/messages/templates` - Update template

### Reports

- `GET /api/reports?period=week` - Get revenue & job stats

### Cron

- `GET /api/cron/reminders` - Send 24hr reminders (hourly)

---

## User Guide

### Creating Your First Client

1. Tap "Clients" in bottom nav
2. Tap "New Client"
3. Enter name, email (optional), phone, tags
4. Add at least one address
5. Include notes: parking info, gate code, pet info, preferences

### Booking a Job

1. Tap "New Job" from Calendar or Jobs page
2. Select client (or create new)
3. Select address from dropdown
4. Pick date/time and duration
5. Choose service type (Standard/Deep/Move-out)
6. Set price
7. Toggle "Recurring" if needed
8. Tap "Create Job"

**Recurring Jobs:**
- Weekly: Every 7 days
- Biweekly: Every 14 days
- Monthly: Same date each month
- Set end date or leave blank for infinite

### Requesting Payment

**Via Stripe:**
1. Open completed job
2. Tap "Request Payment"
3. SMS with payment link sent to client
4. Client pays on mobile
5. Webhook auto-marks job as paid

**Cash/Check/Zelle:**
1. Open job
2. Tap "Mark as Paid"
3. Select payment method
4. Job marked paid immediately

### Message Templates

Default templates created on signup. Customize in Settings:

**Variables:**
- `{{clientName}}` - Client's name
- `{{date}}` - Job date
- `{{time}}` - Job time
- `{{price}}` - Job price
- `{{address}}` - Full address
- `{{businessName}}` - Your business name
- `{{paymentLink}}` - Stripe payment URL

**Example:**
```
Hi {{clientName}}! Your cleaning is confirmed for {{date}} at {{time}}.
See you then! - {{businessName}}
```

---

## Development

### Project Structure

```
/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/           # Login/Signup pages
│   │   ├── (dashboard)/      # Protected app pages
│   │   └── api/              # API routes
│   ├── components/
│   │   ├── ui/               # Reusable UI components
│   │   └── layout/           # Layout components
│   ├── lib/
│   │   ├── prisma.ts         # Prisma client
│   │   ├── auth.ts           # NextAuth config
│   │   ├── stripe.ts         # Stripe client
│   │   ├── twilio.ts         # Twilio client
│   │   ├── utils.ts          # Helper functions
│   │   └── validations.ts    # Zod schemas
│   └── types/
│       └── index.ts          # TypeScript types
├── .env.local                 # Environment variables (git-ignored)
├── package.json
└── vercel.json               # Vercel config (cron)
```

### Common Tasks

**Add new database field:**
```bash
# 1. Update prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name add_field_name
# 3. Regenerate Prisma client
npx prisma generate
```

**Reset database:**
```bash
npx prisma migrate reset
```

**Seed database (optional):**
```bash
# Create prisma/seed.ts and add to package.json
npx prisma db seed
```

**Test Stripe webhooks locally:**
```bash
# Install Stripe CLI
stripe login
stripe listen --forward-to localhost:3000/api/payments/webhook
```

---

## Troubleshooting

### SMS not sending

- Check Twilio credentials in `.env.local`
- Verify phone number format: `+1234567890`
- Check Twilio console for errors
- Trial accounts can only send to verified numbers

### Stripe payments not working

- Verify webhook secret matches Stripe dashboard
- Check webhook endpoint is publicly accessible
- Use Stripe CLI to test locally
- Check Stripe logs for errors

### Database connection failed

- Verify `DATABASE_URL` is correct
- Check database is running (local PostgreSQL)
- For Vercel Postgres, check connection pooling settings
- Try connecting with `npx prisma studio`

### Build failing on Vercel

- Check environment variables are set
- Verify `DATABASE_URL` uses connection pooling
- Check build logs for specific errors
- Ensure `prisma generate` runs in postinstall

---

## Roadmap

**MVP (Current):**
- Single user workspace
- Basic calendar and job management
- Stripe payments + Twilio SMS
- Simple reporting

**Future Enhancements:**
- Team support (assign jobs to helpers)
- Route optimization
- Expense tracking
- Custom service types
- Mobile app (React Native)
- Advanced scheduling
- Client portal

---

## License

MIT License - feel free to use for your cleaning business!

---

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Email: support@cleanercrm.com (if applicable)

---

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Built for cleaners, by developers who care about simplicity.**

Get cleaning, not caught in complex software.
