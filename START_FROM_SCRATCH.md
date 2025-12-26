# Build CleanDayCRM from Scratch - Complete Guide

## Step 1: Create Project Directory (1 min)

```bash
# Create new directory
mkdir CleanDayCRM
cd CleanDayCRM

# Initialize git
git init
```

## Step 2: Initialize Next.js Project (2 min)

```bash
# Create Next.js app with TypeScript and Tailwind
npx create-next-app@14.2.0 . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

When prompted:
- Would you like to use ESLint? **Yes**
- Would you like to use Turbopack? **No**
- Create a new directory? **No** (we're already in CleanDayCRM)

## Step 3: Install Dependencies (2 min)

```bash
npm install @prisma/client@5.20.0 \
  @radix-ui/react-dialog@1.0.5 \
  @radix-ui/react-dropdown-menu@2.0.6 \
  @radix-ui/react-label@2.0.2 \
  @radix-ui/react-select@2.0.0 \
  @radix-ui/react-slot@1.0.2 \
  @radix-ui/react-tabs@1.0.4 \
  @stripe/stripe-js@2.4.0 \
  bcryptjs@2.4.3 \
  class-variance-authority@0.7.0 \
  clsx@2.1.0 \
  date-fns@3.0.6 \
  lucide-react@0.307.0 \
  next-auth@4.24.5 \
  stripe@14.12.0 \
  tailwind-merge@2.2.0 \
  tailwindcss-animate@1.0.7 \
  twilio@4.20.1 \
  zod@3.22.4

npm install -D @types/bcryptjs@2.4.6 prisma@5.20.0
```

## Step 4: Set Up Project Structure (2 min)

```bash
# Create all directories at once
mkdir -p src/{app/{api/{auth/{signup,\[...nextauth\]},bookings/\[id\],clients/\[id\],calendar,payments/{create-link,mark-paid,webhook},messages/{send,templates,webhook},reports,cron/reminders},\(auth\)/{login,signup},\(dashboard\)/{calendar,jobs,clients,settings}},components/{ui,layout,providers},lib,types}

mkdir -p prisma
```

## Step 5: Copy Files from AwesomeCRM (5 min)

Since you already have all the code in `/home/user/AwesomeCRM`, let's copy it:

```bash
# Copy all source files
cp -r /home/user/AwesomeCRM/src/* ./src/
cp -r /home/user/AwesomeCRM/prisma/* ./prisma/

# Copy config files
cp /home/user/AwesomeCRM/tailwind.config.ts ./
cp /home/user/AwesomeCRM/next.config.js ./
cp /home/user/AwesomeCRM/postcss.config.js ./
cp /home/user/AwesomeCRM/.env.example ./
cp /home/user/AwesomeCRM/.gitignore ./

# Copy documentation
cp /home/user/AwesomeCRM/*.md ./
```

## Step 6: Set Up Environment Variables (3 min)

```bash
# Create .env.local
cp .env.example .env.local
```

Edit `.env.local` with your text editor:

```env
# Database - Use Neon for easy testing
DATABASE_URL="postgresql://YOUR_NEON_URL_HERE"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="test-secret-min-32-chars-long-change-this"

# Stripe (test mode for now)
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
STRIPE_WEBHOOK_SECRET=""

# Twilio (optional for testing)
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""

# Cron
CRON_SECRET="test-cron-secret"
```

**Get Quick Database (Neon - Free):**
1. Go to https://neon.tech
2. Sign up with GitHub
3. Create project "cleandaycrm-test"
4. Copy connection string
5. Paste into `DATABASE_URL`

## Step 7: Set Up Database (2 min)

```bash
# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

## Step 8: Test Locally (2 min)

```bash
# Start development server
npm run dev
```

Visit: **http://localhost:3000**

You should see the beautiful landing page! ✨

---

## Testing Checklist (10 min)

### ✅ Test 1: Landing Page
- [ ] Visit http://localhost:3000
- [ ] See "CleanDayCRM" branding
- [ ] Landing page looks good
- [ ] Click "Start Free Trial" goes to /signup

### ✅ Test 2: Sign Up
- [ ] Fill in signup form:
  - Name: "Test User"
  - Email: "test@example.com"
  - Password: "password123"
- [ ] Click "Create Account"
- [ ] Redirects to calendar ✅

### ✅ Test 3: Add Client
- [ ] Click "Clients" tab
- [ ] Click "New Client" (you'll need to create this page)
- [ ] Or use Prisma Studio to add a test client

### ✅ Test 4: Create Job
- [ ] Click "Jobs" tab
- [ ] See empty state
- [ ] (Need to build create form)

### ✅ Test 5: Mobile View
- [ ] Press F12
- [ ] Toggle device toolbar
- [ ] Select iPhone
- [ ] Landing page responsive ✅
- [ ] Bottom nav shows in app ✅

---

## What's Working Right Now ✅

After these steps, you'll have:
- ✅ Beautiful landing page
- ✅ Login/Signup pages
- ✅ Authentication working
- ✅ Database connected
- ✅ Calendar, Jobs, Clients pages (basic UI)
- ✅ Settings page with reports
- ✅ All API routes ready

## What Needs UI Forms 🚧

These work via API but need forms:
- Create client form
- Create job form
- Job detail view
- Client detail view

**For demo, you can:**
1. Use Prisma Studio to add test data
2. Or we can quickly build these forms

---

## Quick Test with Prisma Studio

```bash
# Open Prisma Studio
npx prisma studio
```

Visit: http://localhost:5555

**Add test data:**
1. Click "Client" → Add record
   - name: "John Smith"
   - email: "john@test.com"
   - phone: "+15551234567"
   - userId: [copy from User table]

2. Click "Address" → Add record
   - clientId: [copy from Client you just created]
   - street: "123 Main St"
   - city: "San Francisco"
   - state: "CA"
   - zip: "94102"

3. Click "Booking" → Add record
   - userId: [your user id]
   - clientId: [your client id]
   - addressId: [your address id]
   - scheduledDate: Tomorrow's date
   - duration: 120
   - price: 150
   - status: SCHEDULED

Now refresh your app - the job should appear on the calendar!

---

## Ready to Ship? 🚀

Once local testing works, follow these docs:
- **DEPLOYMENT.md** - Deploy to Vercel
- **DOMAIN_SETUP.md** - Connect CleanDayCRM.com

---

## Troubleshooting

**"Module not found":**
```bash
npm install
```

**Database error:**
- Check DATABASE_URL is correct
- Make sure Neon project is active
- Run `npx prisma migrate dev` again

**Port 3000 already in use:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
npm run dev
```

**Prisma client not generated:**
```bash
npx prisma generate
```

---

## Next Steps

1. **Test locally** - Follow checklist above
2. **Buy domain** - CleanDayCRM.com (~$10)
3. **Deploy to Vercel** - Follow DEPLOYMENT.md
4. **Connect domain** - Follow DOMAIN_SETUP.md
5. **Launch!** - Share on social media

**You can be live in 60 minutes from now!** 🎉
