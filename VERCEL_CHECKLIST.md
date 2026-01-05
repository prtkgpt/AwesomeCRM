# Vercel Setup Checklist

Use this checklist while setting up your Vercel projects.

---

## 📋 Pre-Setup Checklist

Gather these before starting:

- [ ] GitHub account connected to Vercel
- [ ] Production PostgreSQL database URL
- [ ] Staging PostgreSQL database URL (or will use same as production)
- [ ] Stripe LIVE keys (sk_live_..., pk_live_...)
- [ ] Stripe TEST keys (sk_test_..., pk_test_...)
- [ ] Resend API key
- [ ] Generate NEXTAUTH_SECRET for production: `openssl rand -base64 32`
- [ ] Generate NEXTAUTH_SECRET for staging: `openssl rand -base64 32`
- [ ] Generate CRON_SECRET: any random string

---

## 🚀 Production Project Setup

### Basic Setup
- [ ] Go to https://vercel.com/new
- [ ] Import `prtkgpt/AwesomeCRM` repository
- [ ] Project name: `cleandaycrm-production`
- [ ] Framework: Next.js (auto-detected)
- [ ] **Production Branch: `production`** ⚠️ CRITICAL

### Environment Variables - Required
- [ ] `DATABASE_URL` = (your production PostgreSQL URL)
- [ ] `NEXTAUTH_URL` = `https://cleandaycrm.com`
- [ ] `NEXTAUTH_SECRET` = (generated secret #1)
- [ ] `RESEND_API_KEY` = (your Resend key)
- [ ] `EMAIL_DOMAIN` = `cleandaycrm.com`
- [ ] `EMAIL_FROM` = `noreply@cleandaycrm.com`
- [ ] `EMAIL_FROM_ESTIMATES` = `estimates@cleandaycrm.com`
- [ ] `EMAIL_FROM_BOOKINGS` = `bookings@cleandaycrm.com`
- [ ] `EMAIL_FROM_NOTIFICATIONS` = `notifications@cleandaycrm.com`
- [ ] `STRIPE_SECRET_KEY` = `sk_live_...` (LIVE key!)
- [ ] `STRIPE_PUBLISHABLE_KEY` = `pk_live_...` (LIVE key!)
- [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_...`
- [ ] `CRON_SECRET` = (random secret string)

### Environment Variables - Optional
- [ ] `TWILIO_ACCOUNT_SID` = (if using SMS)
- [ ] `TWILIO_AUTH_TOKEN` = (if using SMS)
- [ ] `TWILIO_PHONE_NUMBER` = (if using SMS)
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` = (if using Google Maps)

### Deploy & Configure
- [ ] Click "Deploy"
- [ ] Wait for build to complete (2-5 min)
- [ ] Build successful (green checkmark)
- [ ] Go to Project Settings → Domains
- [ ] Add domain: `cleandaycrm.com`
- [ ] Configure DNS (A record or CNAME)
- [ ] Wait for DNS propagation (5-30 min)
- [ ] Visit https://cleandaycrm.com
- [ ] Site loads correctly
- [ ] Can log in
- [ ] Test a booking/feature

---

## 🧪 Staging Project Setup

### Basic Setup
- [ ] Go to https://vercel.com/new (again)
- [ ] Import `prtkgpt/AwesomeCRM` (same repo)
- [ ] Project name: `cleandaycrm-staging`
- [ ] Framework: Next.js (auto-detected)
- [ ] **Production Branch: `staging`** ⚠️ CRITICAL

### Environment Variables - Required
- [ ] `DATABASE_URL` = (your staging PostgreSQL URL)
- [ ] `NEXTAUTH_URL` = `https://staging.cleandaycrm.com`
- [ ] `NEXTAUTH_SECRET` = (generated secret #2 - DIFFERENT from production)
- [ ] `RESEND_API_KEY` = (your Resend key - same as production)
- [ ] `EMAIL_DOMAIN` = `cleandaycrm.com`
- [ ] `EMAIL_FROM` = `staging@cleandaycrm.com`
- [ ] `EMAIL_FROM_ESTIMATES` = `staging-estimates@cleandaycrm.com`
- [ ] `EMAIL_FROM_BOOKINGS` = `staging-bookings@cleandaycrm.com`
- [ ] `EMAIL_FROM_NOTIFICATIONS` = `staging-notifications@cleandaycrm.com`
- [ ] `STRIPE_SECRET_KEY` = `sk_test_...` (TEST key!)
- [ ] `STRIPE_PUBLISHABLE_KEY` = `pk_test_...` (TEST key!)
- [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_test_...`
- [ ] `CRON_SECRET` = (same or different from production)

### Environment Variables - Optional
- [ ] `TWILIO_ACCOUNT_SID` = (same as production)
- [ ] `TWILIO_AUTH_TOKEN` = (same as production)
- [ ] `TWILIO_PHONE_NUMBER` = (same as production)
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` = (same as production)

### Deploy & Configure
- [ ] Click "Deploy"
- [ ] Wait for build to complete (2-5 min)
- [ ] Build successful (green checkmark)
- [ ] Note auto-generated URL: `cleandaycrm-staging.vercel.app`
- [ ] Visit staging URL
- [ ] Site loads correctly
- [ ] Can log in
- [ ] Test a feature
- [ ] Verify Stripe is in TEST mode

### Optional: Custom Staging Domain
- [ ] Go to Project Settings → Domains
- [ ] Add domain: `staging.cleandaycrm.com`
- [ ] Configure DNS
- [ ] Wait for propagation

---

## ✅ Final Verification

### Production Project
- [ ] URL: https://cleandaycrm.com works
- [ ] Can create account
- [ ] Can log in
- [ ] Dashboard loads
- [ ] Can create a client
- [ ] Can create a booking
- [ ] Stripe payment works (REAL charges - be careful!)
- [ ] Email sending works
- [ ] No errors in Vercel logs

### Staging Project
- [ ] URL: https://staging.cleandaycrm.com (or .vercel.app) works
- [ ] Can create account
- [ ] Can log in
- [ ] Dashboard loads
- [ ] Can create a client
- [ ] Can create a booking
- [ ] Stripe payment works (TEST mode - no real charges)
- [ ] Email sending works
- [ ] No errors in Vercel logs

### Deployment Flow
- [ ] Push to `staging` branch → deploys to staging automatically
- [ ] Push to `production` branch → deploys to production automatically
- [ ] Each project shows correct git branch in dashboard
- [ ] Vercel notifications configured (optional)

---

## 🎯 Quick Reference

### Important URLs

**Vercel Dashboard:**
- Production: https://vercel.com/[your-account]/cleandaycrm-production
- Staging: https://vercel.com/[your-account]/cleandaycrm-staging

**Your Sites:**
- Production: https://cleandaycrm.com
- Staging: https://staging.cleandaycrm.com

**GitHub Repo:**
- https://github.com/prtkgpt/AwesomeCRM

### Environment Variables Summary

| Variable | Production Value | Staging Value |
|----------|-----------------|---------------|
| DATABASE_URL | Production DB | Staging DB |
| NEXTAUTH_URL | cleandaycrm.com | staging.cleandaycrm.com |
| NEXTAUTH_SECRET | Secret #1 | Secret #2 (different!) |
| STRIPE_SECRET_KEY | sk_live_... | sk_test_... |
| STRIPE_PUBLISHABLE_KEY | pk_live_... | pk_test_... |
| Everything else | Same | Same |

---

## 🚨 Common Issues

### Build Failed
- [ ] Check all environment variables are set
- [ ] Verify DATABASE_URL is correct
- [ ] Check build logs in Vercel
- [ ] Try building locally: `npm run build`

### Can't Log In
- [ ] Verify NEXTAUTH_URL matches your domain
- [ ] Check NEXTAUTH_SECRET is set
- [ ] Clear browser cookies
- [ ] Check database connection

### Stripe Not Working
- [ ] Production uses sk_live_... keys
- [ ] Staging uses sk_test_... keys
- [ ] Webhook URL configured in Stripe dashboard
- [ ] STRIPE_WEBHOOK_SECRET matches Stripe

### Emails Not Sending
- [ ] RESEND_API_KEY is set
- [ ] EMAIL_FROM domain is verified in Resend
- [ ] Check Vercel logs for errors
- [ ] Verify Resend API key is active

---

## 📞 Need Help?

- **Vercel Docs:** https://vercel.com/docs
- **Full Setup Guide:** See `VERCEL_SETUP.md`
- **Vercel Support:** https://vercel.com/support

---

## ✅ When You're Done

You should have:
- ✅ Two Vercel projects (production + staging)
- ✅ Both deploying automatically
- ✅ Both sites accessible and working
- ✅ Different Stripe keys (live vs test)
- ✅ Different database URLs (recommended)
- ✅ Proper workflow: feature → staging → production

**You're ready to build! 🎉**

---

**Total Time:** ~30-45 minutes (including DNS propagation)

**Next Steps:**
1. Test the deployment workflow
2. Build a new feature
3. Deploy to staging → test → production
