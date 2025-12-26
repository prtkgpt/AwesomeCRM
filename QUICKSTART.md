# CleanerCRM - Quick Start Guide

Get your CRM running in under 10 minutes!

## What You'll Need

Before starting, sign up for these free services:

1. **Database**: [Vercel Postgres](https://vercel.com/storage/postgres) (free tier)
2. **Payments**: [Stripe](https://stripe.com) (test mode is free)
3. **SMS** (optional): [Twilio](https://twilio.com) (free trial with $15 credit)

## Installation Steps

### Step 1: Install Dependencies (2 min)

```bash
npm install
```

### Step 2: Configure Environment (3 min)

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Generate secrets:
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate CRON_SECRET
openssl rand -base64 32
```

3. Fill in `.env.local`:
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="paste-your-generated-secret"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+15551234567"
CRON_SECRET="paste-your-generated-secret"
```

### Step 3: Set Up Database (2 min)

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init
```

### Step 4: Start Development Server (1 min)

```bash
npm run dev
```

Visit `http://localhost:3000` and create your account!

### Step 5: Configure Integrations (2 min)

#### Stripe Setup
1. Get test API keys from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. For webhooks (production only):
   - Add endpoint: `https://your-domain.com/api/payments/webhook`
   - Events: `payment_intent.succeeded`, `checkout.session.completed`

#### Twilio Setup (Optional)
1. Get credentials from [Twilio Console](https://console.twilio.com)
2. Buy a phone number ($1/month) or use trial number
3. Trial accounts can only send to verified numbers

---

## First Steps After Login

### 1. Add Your First Client

1. Tap "Clients" in bottom navigation
2. Tap "New Client"
3. Fill in:
   - Name: "Jane Doe"
   - Email: "jane@example.com"
   - Phone: "+15551234567"
   - Tags: "Weekly", "VIP"
4. Add address:
   - Street: "123 Main St"
   - City: "San Francisco"
   - State: "CA"
   - ZIP: "94102"
   - Notes: "Gate code: 1234, Dog named Max"

### 2. Create Your First Job

1. Tap "Calendar" or "Jobs"
2. Tap "New Job"
3. Select your client
4. Pick date/time
5. Set price: $100
6. Toggle "Recurring" for weekly jobs
7. Tap "Create"

### 3. Test Payment Request

1. Open the job you created
2. Tap "Request Payment"
3. Choose "Stripe" to generate payment link
4. Or tap "Mark as Paid" for cash

### 4. Customize Message Templates

1. Go to "Settings"
2. Scroll to "Message Templates"
3. Edit the confirmation message:
   ```
   Hi {{clientName}}! Your cleaning is set for {{date}} at {{time}}.
   Can't wait to make your home sparkle! - Your Name
   ```

---

## Testing

### Test Stripe Payments

Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Any future expiry date and any 3-digit CVC

### Test SMS Locally

Without Twilio configured, the app will:
- Log "SMS would be sent" to console
- Still save message in database
- Show UI as if SMS sent

To actually send SMS:
1. Configure Twilio in `.env.local`
2. Use a verified phone number (trial account)
3. Send test message from job details page

### Test Cron Job Locally

```bash
curl -H "Authorization: Bearer your-cron-secret" \
  http://localhost:3000/api/cron/reminders
```

---

## Common Issues

**"DATABASE_URL is not defined"**
- Make sure `.env.local` exists (not `.env.example`)
- Verify `DATABASE_URL` is set correctly

**"Failed to connect to database"**
- Check PostgreSQL is running locally
- Or use a hosted database (Vercel Postgres, Railway, Supabase)

**"Stripe error: No such customer"**
- This is normal in test mode
- Client will be created on first payment

**SMS not sending**
- Check Twilio credentials
- Verify phone number format: `+1234567890`
- Trial accounts can only send to verified numbers

---

## Next Steps

### Production Deployment

See [README.md](./README.md) for full deployment guide to Vercel.

Quick version:
```bash
# 1. Push to GitHub
git push origin main

# 2. Deploy to Vercel
# - Import repository at vercel.com
# - Add environment variables
# - Deploy!

# 3. Set up production database
# - Add Vercel Postgres
# - Run: npx prisma migrate deploy

# 4. Configure webhooks
# - Stripe: https://your-domain.vercel.app/api/payments/webhook
# - Twilio: https://your-domain.vercel.app/api/messages/webhook
```

### Customization Ideas

1. **Add more service types**: Edit `prisma/schema.prisma` ServiceType enum
2. **Custom tags**: Add any tags you want (VIP, Monthly, Pain, etc.)
3. **Longer/shorter jobs**: Change duration in booking form
4. **Different pricing**: Each job can have custom price

---

## Support

- Read full docs: [README.md](./README.md)
- Architecture details: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Issues: Open a GitHub issue

---

**You're all set! Start booking jobs and getting paid faster.**
