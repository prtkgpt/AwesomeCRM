# Vercel Setup Guide - Production & Staging

## 🎯 Overview

You'll create **TWO separate Vercel projects**:
1. **Production Project** → Deploys from `production` branch → cleandaycrm.com
2. **Staging Project** → Deploys from `staging` branch → staging.cleandaycrm.com

---

## 📋 Before You Start

Have these ready:
- [ ] GitHub account connected to Vercel
- [ ] Production database URL (PostgreSQL)
- [ ] Staging database URL (or use same as production for now)
- [ ] Stripe API keys (live for production, test for staging)
- [ ] Resend API key
- [ ] Twilio credentials (optional)
- [ ] Google Maps API key (optional)

---

## 🚀 Part 1: Production Project Setup

### Step 1: Create New Project

1. **Go to Vercel Dashboard:** https://vercel.com/new

2. **Import Git Repository**
   - Click **"Add New..."** → **"Project"**
   - Select **"Import Git Repository"**
   - Find and select: **`prtkgpt/AwesomeCRM`**
   - Click **"Import"**

### Step 2: Configure Project Settings

**Project Name:**
```
cleandaycrm-production
```

**Framework Preset:**
- Should auto-detect: **Next.js**
- Leave as detected

**Root Directory:**
- Leave as: `./` (default)

**Build Command:**
```
npm run vercel-build
```
(or leave default: `next build`)

**Output Directory:**
- Leave as: `.next` (default)

**Install Command:**
- Leave as: `npm install` (default)

### Step 3: Configure Git Branch

⚠️ **CRITICAL SETTING:**

Look for **"Git"** or **"Production Branch"** settings:
- **Production Branch:** `production`

Make sure it says `production`, NOT `main` or `master`!

### Step 4: Add Environment Variables

Click **"Environment Variables"** section.

For each variable below:
1. Click **"Add"**
2. Enter **Key** (left field)
3. Enter **Value** (right field)
4. Select **"Production"** environment
5. Click **"Add"**

#### Required Variables:

**Database:**
```
Key: DATABASE_URL
Value: postgresql://user:password@host:5432/database?schema=public
Environment: Production
```

**Authentication:**
```
Key: NEXTAUTH_URL
Value: https://cleandaycrm.com
Environment: Production
```

```
Key: NEXTAUTH_SECRET
Value: <generate-with: openssl rand -base64 32>
Environment: Production
```

**Email (Resend):**
```
Key: RESEND_API_KEY
Value: re_...
Environment: Production
```

```
Key: EMAIL_DOMAIN
Value: cleandaycrm.com
Environment: Production
```

```
Key: EMAIL_FROM
Value: noreply@cleandaycrm.com
Environment: Production
```

```
Key: EMAIL_FROM_ESTIMATES
Value: estimates@cleandaycrm.com
Environment: Production
```

```
Key: EMAIL_FROM_BOOKINGS
Value: bookings@cleandaycrm.com
Environment: Production
```

```
Key: EMAIL_FROM_NOTIFICATIONS
Value: notifications@cleandaycrm.com
Environment: Production
```

**Stripe (Use LIVE keys):**
```
Key: STRIPE_SECRET_KEY
Value: sk_live_...
Environment: Production
```

```
Key: STRIPE_PUBLISHABLE_KEY
Value: pk_live_...
Environment: Production
```

```
Key: STRIPE_WEBHOOK_SECRET
Value: whsec_...
Environment: Production
```

**Cron Security:**
```
Key: CRON_SECRET
Value: <any-random-secret-string>
Environment: Production
```

#### Optional Variables:

**Twilio (SMS):**
```
Key: TWILIO_ACCOUNT_SID
Value: AC...
Environment: Production
```

```
Key: TWILIO_AUTH_TOKEN
Value: ...
Environment: Production
```

```
Key: TWILIO_PHONE_NUMBER
Value: +1234567890
Environment: Production
```

**Google Maps:**
```
Key: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
Value: AIza...
Environment: Production
```

### Step 5: Deploy

1. **Click "Deploy"**
2. **Wait for deployment** (2-5 minutes)
3. **Check for errors** in the build logs

### Step 6: Configure Custom Domain

After successful deployment:

1. Go to **Project Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter: `cleandaycrm.com`
4. Click **"Add"**
5. Follow DNS configuration instructions:
   - Add `A` record pointing to Vercel's IP
   - Or add `CNAME` record pointing to `cname.vercel-dns.com`
6. Wait for DNS propagation (5-30 minutes)

---

## 🧪 Part 2: Staging Project Setup

### Step 1: Create Second Project

1. **Go to Vercel Dashboard:** https://vercel.com/new

2. **Import SAME Repository Again**
   - Click **"Add New..."** → **"Project"**
   - Select **"Import Git Repository"**
   - Find and select: **`prtkgpt/AwesomeCRM`** (same repo!)
   - Click **"Import"**

### Step 2: Configure Project Settings

**Project Name:**
```
cleandaycrm-staging
```

**Framework Preset:**
- Should auto-detect: **Next.js**

**Root Directory:**
- Leave as: `./`

**Build Command:**
- Leave default or: `npm run vercel-build`

### Step 3: Configure Git Branch

⚠️ **CRITICAL SETTING:**

Look for **"Git"** or **"Production Branch"** settings:
- **Production Branch:** `staging`

Make sure it says `staging`, NOT `production`!

### Step 4: Add Environment Variables

Same process as production, but with these key differences:

#### Different Values for Staging:

**Database (Staging):**
```
Key: DATABASE_URL
Value: postgresql://user:password@staging-host:5432/staging-db
Environment: Production (yes, even for staging project)
```

**Authentication (Staging):**
```
Key: NEXTAUTH_URL
Value: https://staging.cleandaycrm.com
Environment: Production
```

```
Key: NEXTAUTH_SECRET
Value: <different-secret-than-production>
Environment: Production
```

**Stripe (Use TEST keys):**
```
Key: STRIPE_SECRET_KEY
Value: sk_test_...
Environment: Production
```

```
Key: STRIPE_PUBLISHABLE_KEY
Value: pk_test_...
Environment: Production
```

```
Key: STRIPE_WEBHOOK_SECRET
Value: whsec_test_...
Environment: Production
```

**All other variables:** Same as production (Resend, Twilio, etc.)

### Step 5: Deploy Staging

1. **Click "Deploy"**
2. **Wait for deployment** (2-5 minutes)
3. **Check build logs**

### Step 6: Configure Staging Domain (Optional)

**Option A: Custom Domain**
1. Go to **Project Settings** → **Domains**
2. Add: `staging.cleandaycrm.com`
3. Configure DNS as instructed

**Option B: Use Auto-Generated URL**
- Vercel gives you: `cleandaycrm-staging.vercel.app`
- Use this for staging (easier, no DNS setup needed)

---

## ✅ Verification Checklist

After both projects are deployed:

### Production Project
- [ ] Project name: `cleandaycrm-production`
- [ ] Connected to branch: `production`
- [ ] Domain: `cleandaycrm.com` (configured)
- [ ] Environment variables: All set (production values)
- [ ] Build successful (green checkmark)
- [ ] Site accessible at cleandaycrm.com
- [ ] Can log in and use the app

### Staging Project
- [ ] Project name: `cleandaycrm-staging`
- [ ] Connected to branch: `staging`
- [ ] Domain: `staging.cleandaycrm.com` or auto-generated
- [ ] Environment variables: All set (test values)
- [ ] Build successful (green checkmark)
- [ ] Site accessible at staging URL
- [ ] Can log in and use the app
- [ ] Stripe is in TEST mode (no real charges)

---

## 🔧 Environment Variables - Complete List

Here's the complete list for copy/paste:

### Production Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public

# Authentication
NEXTAUTH_URL=https://cleandaycrm.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_DOMAIN=cleandaycrm.com
EMAIL_FROM=noreply@cleandaycrm.com
EMAIL_FROM_ESTIMATES=estimates@cleandaycrm.com
EMAIL_FROM_BOOKINGS=bookings@cleandaycrm.com
EMAIL_FROM_NOTIFICATIONS=notifications@cleandaycrm.com

# Stripe (LIVE keys)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cron
CRON_SECRET=<random-secret-string>

# Optional: Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890

# Optional: Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

### Staging Environment Variables

```bash
# Database (STAGING)
DATABASE_URL=postgresql://user:password@staging-host:5432/staging-db

# Authentication (STAGING URL)
NEXTAUTH_URL=https://staging.cleandaycrm.com
NEXTAUTH_SECRET=<different-secret>

# Email (Same as production - emails will send from staging)
RESEND_API_KEY=re_...
EMAIL_DOMAIN=cleandaycrm.com
EMAIL_FROM=staging@cleandaycrm.com
EMAIL_FROM_ESTIMATES=staging-estimates@cleandaycrm.com
EMAIL_FROM_BOOKINGS=staging-bookings@cleandaycrm.com
EMAIL_FROM_NOTIFICATIONS=staging-notifications@cleandaycrm.com

# Stripe (TEST keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# Cron
CRON_SECRET=<same-or-different-secret>

# Optional: Same as production
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

---

## 🎯 How Deployments Work Now

### Automatic Deployments

**Push to `staging` branch:**
```bash
git push origin staging
```
→ Automatically deploys to staging.cleandaycrm.com

**Push to `production` branch:**
```bash
git push origin production
```
→ Automatically deploys to cleandaycrm.com

### Manual Deployments (Emergency)

**Redeploy production:**
1. Go to Vercel dashboard
2. Select `cleandaycrm-production` project
3. Click "Deployments"
4. Find latest deployment
5. Click "..." → "Redeploy"

---

## 🚨 Troubleshooting

### Build Failed

**Check:**
1. Build logs in Vercel dashboard
2. Environment variables are all set
3. Database URL is correct
4. No TypeScript errors (run `npm run build` locally)

**Common Issues:**
- Missing `DATABASE_URL` → Build fails at Prisma generation
- Missing `NEXTAUTH_SECRET` → Runtime error
- Wrong `NEXTAUTH_URL` → Login redirects fail

### Site is Slow/Not Loading

**Check:**
1. Deployment status (should be "Ready")
2. Vercel status page: https://vercel-status.com
3. Database connection (check database provider status)
4. Domain DNS settings (if using custom domain)

### Environment Variable Changes Not Taking Effect

**Solution:**
1. Go to Project Settings → Environment Variables
2. Edit the variable
3. Click "Save"
4. Go to Deployments
5. Click "Redeploy" on latest deployment
6. Select "Use existing Build Cache" (faster) or rebuild

### Different Database for Staging?

**Option 1: Separate Staging Database (Recommended)**
- Create a new PostgreSQL database for staging
- Use different `DATABASE_URL` in staging project
- Keeps production data safe

**Option 2: Same Database (Quick Setup)**
- Use same `DATABASE_URL` for both
- ⚠️ Be careful: staging and production share data
- Good for testing, bad for long-term

---

## 📊 Monitoring Your Deployments

### Vercel Dashboard

**For each project, monitor:**
- **Deployments:** See deployment history, status
- **Analytics:** Traffic, performance metrics
- **Logs:** Runtime errors, API logs
- **Checks:** Build status, deployment checks

### Set Up Alerts

1. Go to Project Settings → Notifications
2. Enable:
   - ✅ Deployment Failed
   - ✅ Deployment Ready
   - ✅ Domain Configuration Changed
3. Add your email or Slack webhook

---

## 🔐 Security Best Practices

### Environment Variables

- ✅ **Never commit** `.env` files to git
- ✅ Use **different secrets** for staging/production
- ✅ Rotate `NEXTAUTH_SECRET` periodically
- ✅ Use Stripe **test keys** on staging
- ✅ Keep `CRON_SECRET` private

### Database

- ✅ Use **separate databases** for staging/production
- ✅ Restrict database access by IP (if possible)
- ✅ Regular backups of production database
- ✅ Test database migrations on staging first

### Domains

- ✅ Use **HTTPS only** (Vercel does this automatically)
- ✅ Enable **automatic HTTPS redirects**
- ✅ Configure proper **CORS** settings

---

## ✅ Success Checklist

After completing setup:

- [ ] Both projects created in Vercel
- [ ] Production deploys from `production` branch
- [ ] Staging deploys from `staging` branch
- [ ] All environment variables configured
- [ ] Production domain working (cleandaycrm.com)
- [ ] Staging domain working (staging URL)
- [ ] Can log in to both environments
- [ ] Stripe test mode works on staging
- [ ] Emails sending correctly
- [ ] Database connections working
- [ ] No build errors in logs
- [ ] Automatic deployments working

---

## 🎓 What You Just Built

You now have:

1. **Production Environment**
   - Live site at cleandaycrm.com
   - Real payments, real emails
   - Deploys automatically from `production` branch
   - Protected by branch rules

2. **Staging Environment**
   - Test site at staging.cleandaycrm.com
   - Test payments, test emails
   - Deploys automatically from `staging` branch
   - Safe place to test changes

3. **Proper Workflow**
   ```
   feature → staging → production
   develop   test      deploy
   ```

---

## 🚀 Next Steps

1. **Test the workflow:**
   - Make a small change
   - Push to staging
   - Verify on staging.cleandaycrm.com
   - Push to production
   - Verify on cleandaycrm.com

2. **Set up webhooks:**
   - Stripe webhooks for both environments
   - Configure in Stripe dashboard

3. **Monitor deployments:**
   - Check Vercel dashboard regularly
   - Set up Slack/email notifications

4. **Start building features!**
   - All changes go through staging first
   - Production stays stable

---

## 📚 Resources

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **Environment Variables:** https://vercel.com/docs/concepts/projects/environment-variables
- **Custom Domains:** https://vercel.com/docs/concepts/projects/domains

---

**Questions? Issues?** Check the troubleshooting section above or Vercel's support docs.

**Ready to deploy!** 🎉
