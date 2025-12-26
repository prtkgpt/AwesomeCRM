# Ship CleanerCRM - Complete Deployment Guide

**Goal:** Get CleanerCRM live and ready for your first customers in ~30 minutes.

---

## 📋 Prerequisites (Get These Ready First)

Before deploying, create accounts for these services:

1. **Vercel Account** (free) - https://vercel.com/signup
2. **Stripe Account** (free) - https://stripe.com/register
3. **Twilio Account** (optional, $15 free credit) - https://twilio.com/try-twilio

---

## Step 1: Prepare Stripe (5 minutes)

### Get API Keys

1. Log into Stripe Dashboard: https://dashboard.stripe.com
2. Click **"Developers"** → **"API keys"**
3. Copy these keys:
   - **Publishable key** (starts with `pk_live_`)
   - **Secret key** (starts with `sk_live_`)
4. Save them somewhere safe (you'll add to Vercel later)

### Set Up Webhook

1. Click **"Developers"** → **"Webhooks"**
2. Click **"Add endpoint"**
3. For now, use a temporary URL: `https://example.com/api/payments/webhook`
   - We'll update this after deployment
4. Select these events:
   - `payment_intent.succeeded`
   - `checkout.session.completed`
5. Click **"Add endpoint"**
6. Copy the **"Signing secret"** (starts with `whsec_`)

---

## Step 2: Prepare Twilio (5 minutes, optional)

### Get Credentials

1. Log into Twilio Console: https://console.twilio.com
2. From the dashboard, copy:
   - **Account SID** (starts with `AC`)
   - **Auth Token** (click to reveal and copy)

### Buy a Phone Number

1. Click **"Phone Numbers"** → **"Buy a number"**
2. Choose a number (~$1/month)
3. Copy the phone number (format: `+15551234567`)

**Skip Twilio?** The app will work without SMS features - you just can't send automated reminders.

---

## Step 3: Generate Security Secrets (2 minutes)

Open your terminal and run these commands:

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate CRON_SECRET
openssl rand -base64 32
```

**Copy both outputs** - you'll need them in Step 5.

---

## Step 4: Deploy to Vercel (5 minutes)

### Push to GitHub

```bash
# If you haven't already
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

### Import to Vercel

1. Go to https://vercel.com
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Click **"Import"**

**⚠️ Don't click Deploy yet!** We need to add environment variables first.

---

## Step 5: Add Environment Variables (5 minutes)

In Vercel's **"Environment Variables"** section, add each variable below.

**For each variable:**
- Make sure all three environments are checked:
  - ☑️ Production
  - ☑️ Preview
  - ☑️ Development
- Click **"Add"** after each one

### Variables to Add:

```env
# Your App URL (Vercel will show this - use it)
NEXTAUTH_URL
https://YOUR-APP-NAME.vercel.app

# Auth Secret (from Step 3, first secret)
NEXTAUTH_SECRET
paste-your-first-generated-secret-here

# Stripe Keys (from Step 1)
STRIPE_SECRET_KEY
sk_live_xxxxx

STRIPE_PUBLISHABLE_KEY
pk_live_xxxxx

STRIPE_WEBHOOK_SECRET
whsec_xxxxx

# Twilio (from Step 2, or skip if not using SMS)
TWILIO_ACCOUNT_SID
ACxxxxx

TWILIO_AUTH_TOKEN
your-auth-token

TWILIO_PHONE_NUMBER
+15551234567

# Cron Secret (from Step 3, second secret)
CRON_SECRET
paste-your-second-generated-secret-here
```

---

## Step 6: Add Database (3 minutes)

1. In your Vercel project, click **"Storage"** tab
2. Click **"Create Database"**
3. Choose **"Postgres"**
4. Click **"Create"**
5. Wait ~1 minute for provisioning

✅ **Vercel automatically adds `DATABASE_URL` to your environment variables!**

---

## Step 7: Deploy! (2 minutes)

1. Click **"Deploy"** button in Vercel
2. Wait for build to complete (~2 minutes)
3. You'll see **"Congratulations!"** when done
4. Copy your deployment URL: `https://YOUR-APP-NAME.vercel.app`

---

## Step 8: Run Database Migrations (2 minutes)

On your **local machine**:

```bash
# Install Vercel CLI (if you haven't already)
npm i -g vercel

# Pull environment variables from Vercel
vercel env pull .env.local

# Run database migrations
npx prisma migrate deploy
```

✅ **Your database is now set up!**

---

## Step 9: Update Stripe Webhook URL (1 minute)

Now that you have your real Vercel URL:

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Click **"..."** → **"Update details"**
4. Update URL to: `https://YOUR-APP-NAME.vercel.app/api/payments/webhook`
5. Click **"Update endpoint"**

---

## Step 10: Test Your Deployment (5 minutes)

### Visit Your Landing Page

Go to: `https://YOUR-APP-NAME.vercel.app`

You should see:
- ✅ Beautiful landing page
- ✅ "Start Free Trial" button
- ✅ "Sign In" link in header

### Create Your Account

1. Click **"Start Free Trial"** or **"Sign Up"**
2. Enter:
   - Your email
   - Strong password
   - Your name
   - Your phone number
   - Your business name
3. Click **"Create Account"**

✅ **You should be redirected to the Calendar page!**

### Test the App

#### Add a Test Client

1. Click **"Clients"** in bottom nav
2. Click **"New Client"**
3. Fill in:
   - Name: "Test Customer"
   - Email: your-email@gmail.com
   - Phone: your-phone-number
   - Tags: "Test"
4. Add an address:
   - Street: "123 Main St"
   - City: "San Francisco"
   - State: "CA"
   - ZIP: "94102"
   - Notes: "Test address"
5. Click **"Create Client"**

#### Create a Test Job

1. Click **"Calendar"** or **"Jobs"**
2. Click **"New Job"**
3. Select your test client
4. Pick tomorrow's date
5. Set price: $50
6. Click **"Create Job"**

✅ **Job should appear on your calendar!**

#### Test Stripe Payment

1. Open the job you just created
2. Click **"Request Payment"**
3. Click the payment link that appears
4. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
5. Complete the payment

✅ **Go back to the job - it should auto-mark as "Paid"!**

---

## Step 11: Prepare for Real Customers (10 minutes)

### Customize Message Templates

1. Go to **Settings**
2. Scroll to **"Message Templates"**
3. Update these templates:

**Confirmation Template:**
```
Hi {{clientName}}! Your cleaning is confirmed for {{date}} at {{time}}.
Looking forward to making your home sparkle! - [Your Name]
```

**Reminder Template:**
```
Hi {{clientName}}! Reminder: I'll be cleaning tomorrow at {{time}}.
See you then! - [Your Name]
```

**Thank You Template:**
```
Thanks {{clientName}}! Your home is all clean. Hope you love it!
I'd really appreciate a review. - [Your Name]
```

### Switch Stripe to Live Mode

⚠️ **Important:** Right now you're in test mode. For real payments:

1. In Stripe Dashboard, toggle **"Test mode"** to **OFF** (top right)
2. Go to **Developers** → **API keys**
3. Copy the **LIVE** keys:
   - Live Publishable key (`pk_live_`)
   - Live Secret key (`sk_live_`)
4. Update in Vercel:
   - Go to your project → **Settings** → **Environment Variables**
   - Edit `STRIPE_SECRET_KEY` → paste live secret key
   - Edit `STRIPE_PUBLISHABLE_KEY` → paste live publishable key
   - Click **"Save"**
5. Create a new webhook for live mode:
   - Stripe Dashboard → **Developers** → **Webhooks**
   - Click **"Add endpoint"**
   - URL: `https://YOUR-APP-NAME.vercel.app/api/payments/webhook`
   - Events: `payment_intent.succeeded`, `checkout.session.completed`
   - Copy the new **live** webhook secret
6. Update in Vercel:
   - Edit `STRIPE_WEBHOOK_SECRET` → paste live webhook secret
   - Click **"Save"**
7. Redeploy:
   - Go to **"Deployments"** tab
   - Click **"..."** on latest deployment → **"Redeploy"**

---

## Step 12: Onboard Your First Cleaners (15 min per cleaner)

### Send Them the Signup Link

Share: `https://YOUR-APP-NAME.vercel.app/signup`

Or better yet, share the landing page so they can learn about it first:
`https://YOUR-APP-NAME.vercel.app`

### Walk Through Setup

#### 1. Create Account
- Use their email
- Strong password
- Their name and business name
- Their phone number

#### 2. Add First Client
- Go to **Clients** → **New Client**
- Enter client name, phone, tags
- Add address with notes (gate codes, parking, pets)

#### 3. Create First Job
- Go to **Calendar** or **Jobs**
- Click **New Job**
- Select client and address
- Pick date, time, duration
- Set price
- Toggle **"Recurring"** if it's a regular customer

#### 4. Show Payment Collection

**For Stripe Payments:**
- Complete the job
- Tap **"Request Payment"**
- SMS with link sent to customer
- Customer pays from their phone
- Job auto-marks as paid

**For Cash/Check:**
- Tap **"Mark as Paid"**
- Select payment method
- Done!

#### 5. Show Reports
- Go to **Settings**
- See revenue (week/month)
- See completed jobs
- See unpaid amounts
- See upcoming schedule

---

## 🎉 You're Live!

Your cleaners can now:
- ✅ Manage clients from their phone
- ✅ Book jobs in under 30 seconds
- ✅ Send automated SMS reminders
- ✅ Collect payments via Stripe or mark cash
- ✅ Track revenue and unpaid jobs
- ✅ See their daily schedule

---

## 🚀 Marketing Your Landing Page

Now that you have a landing page, drive traffic to it!

### Share on Social Media
```
🧹 Just launched CleanerCRM - a simple CRM built for home cleaners!

✅ Book jobs in 30 seconds
✅ Get paid via text
✅ Auto reminders
✅ Just $10/month

14-day free trial. Check it out! 👇
https://YOUR-APP-NAME.vercel.app
```

### Post in Cleaner Groups
- Facebook groups for cleaners
- Reddit: r/EntrepreneurRideAlong, r/smallbusiness
- Local cleaner meetups
- Cleaning supply store bulletin boards

### Email to Cleaners You Know
Use this template:

```
Subject: I built something for you

Hey [Name],

I know managing clients, schedules, and payments can be a headache.

I built CleanerCRM specifically for cleaners like you:
- Calendar + clients + payments all in one
- Works perfectly on your phone
- Book jobs in 30 seconds
- Get paid faster with text payment links
- Just $10/month

I'd love to give you early access. Try it free for 14 days:
https://YOUR-APP-NAME.vercel.app

Let me know what you think!

[Your name]
```

---

## 🔧 Troubleshooting

### Landing page not showing
- Clear your browser cache
- Try incognito/private mode
- Check Vercel deployment status

### "Can't log in"
- Check email/password are correct
- Try creating a new account
- Check browser console for errors

### "SMS not sending"
- Verify Twilio credentials in Vercel
- Check Twilio account has credit
- Verify phone format: `+15551234567`
- Trial accounts can only text verified numbers

### "Payment link not working"
- Check you switched to **live** Stripe keys
- Verify webhook secret matches live webhook
- Check Stripe webhook logs for errors

### "Database error"
- Verify migrations ran: `npx prisma migrate deploy`
- Check `DATABASE_URL` is set in Vercel
- Try reconnecting Vercel Postgres

---

## 📊 Optional Enhancements

### Add Custom Domain

1. Buy a domain (e.g., `cleanercrm.com`)
2. In Vercel project → **Settings** → **Domains**
3. Add your domain and follow DNS setup
4. Update `NEXTAUTH_URL` to your custom domain
5. Update Stripe webhook URL to custom domain

### Add Analytics

**Vercel Analytics** (easiest):
1. In Vercel project → **Analytics** tab
2. Click **"Enable"**
3. That's it!

**Google Analytics:**
1. Create GA4 property
2. Add tracking code to `/src/app/layout.tsx`

### Set Up Email Support

Create: `support@yourdomain.com`

Add to landing page footer:
```tsx
<a href="mailto:support@yourdomain.com">support@yourdomain.com</a>
```

---

## ✅ Launch Checklist

- [ ] Vercel deployed successfully
- [ ] Database migrations completed
- [ ] Landing page loads correctly
- [ ] Can create account and log in
- [ ] Can add clients
- [ ] Can create jobs
- [ ] Stripe webhook configured (LIVE mode)
- [ ] Twilio SMS configured (optional)
- [ ] Message templates customized
- [ ] Tested complete payment flow
- [ ] Custom domain added (optional)
- [ ] Analytics set up (optional)
- [ ] First 2-3 beta customers ready
- [ ] Marketing plan ready

---

## 🎯 Next Steps

1. **Get 3 beta customers** - Friends who clean
2. **Gather feedback** - What do they love? What's missing?
3. **Iterate quickly** - Fix bugs, add must-have features
4. **Ask for referrals** - Happy customers → more customers
5. **Share on social** - Build in public

---

**🚀 You're ready to ship! Go get your first customers!**

Built with ❤️ for cleaners who deserve simple, powerful tools.
