# 🚀 CleanDayCRM Production Deployment Guide

## 📦 Ready to Deploy

**Branch:** `claude/find-fix-bug-mjz2k6r5trm3iofs-V2gv4`
**Latest Commit:** `9e745c6`
**Domain:** `cleandaycrm.com`

---

## ✨ What's Included in This Release

### 1. **Calendar Bug Fix**
- Fixed upcoming/past job filtering by date
- Upcoming tab shows only future jobs
- Past tab shows only completed jobs

### 2. **Unassigned Job Highlighting**
- Jobs without cleaners have pink background
- "⚠️ No Cleaner" badge
- Easy visual identification

### 3. **Stripe Payment Integration**
- Company settings page with Stripe credentials
- Multi-tenant webhook support (each company has unique URL)
- Auto-payment confirmation via webhooks

### 4. **Duplicate Job Feature**
- Copy past jobs to create new ones
- All customer data pre-filled
- Quick repeat scheduling

### 5. **Payment UX Improvements**
- "SAVE" button for manual payments
- Cleaner payment method selection

---

## 🗄️ Database Migration Required

**⚠️ CRITICAL:** Run this SQL in Neon Console **BEFORE** deploying:

```sql
-- Add Stripe credentials to Company table
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "stripeSecretKey" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "stripePublishableKey" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "stripeWebhookSecret" TEXT;
```

### How to Run Migration:

1. Go to [Neon Dashboard](https://console.neon.tech)
2. Select your production database
3. Click **SQL Editor**
4. Paste the SQL above
5. Click **Run**
6. Verify: You should see "ALTER TABLE" success 3 times

---

## 🔧 Environment Variables

**No new environment variables needed!** 🎉

All Stripe credentials are stored per-company in the database. Each cleaning company enters their own Stripe keys in Settings.

---

## 📋 Deployment Steps

### Option A: Vercel Auto-Deploy (Recommended)

1. **Merge to main branch:**
   ```bash
   git checkout main
   git merge claude/find-fix-bug-mjz2k6r5trm3iofs-V2gv4
   git push origin main
   ```

2. **Vercel will auto-deploy**
   - Monitor deployment at vercel.com/dashboard
   - Wait for deployment to complete (~2-3 minutes)

3. **Run database migration** (see section above)

4. **Verify deployment:**
   - Visit https://cleandaycrm.com
   - Test login
   - Check Settings → Company page shows Stripe fields

---

## ✅ Post-Deployment Checklist

After deploying, verify these features work:

### 1. Jobs Page
- [ ] Upcoming tab shows only future jobs
- [ ] Past tab shows only past jobs
- [ ] Unassigned jobs have pink background
- [ ] "⚠️ No Cleaner" badge appears

### 2. Settings Page
- [ ] Navigate to Settings → Company
- [ ] Verify Stripe Payment Integration section exists
- [ ] Check webhook URL is displayed
- [ ] Test copying webhook URL

### 3. Duplicate Job
- [ ] Open any job detail page
- [ ] Click "Duplicate" button
- [ ] Verify new job page pre-fills data

### 4. Payment Buttons
- [ ] Mark a job as completed
- [ ] Verify "SAVE" button appears
- [ ] Test selecting payment method

---

## 🏢 Setting Up First Company (Awesome Maids LLC)

### Step 1: Add Stripe Credentials

1. Login as Awesome Maids LLC owner
2. Go to Settings → Company
3. Enter Stripe credentials
4. Click Save

### Step 2: Copy Webhook URL

After saving, click Copy button on webhook URL

### Step 3: Configure Stripe Webhook

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint with your webhook URL
3. Select payment events
4. Copy signing secret

### Step 4: Add Webhook Secret

Paste signing secret back in CleanDayCRM Settings

---

## 🎯 Success Criteria

Deployment is successful when:

✅ All post-deployment tests pass
✅ Awesome Maids LLC can login
✅ Stripe credentials save properly
✅ Webhook URL displays
✅ Jobs sort correctly
✅ Unassigned jobs highlighted

---

**Ready to ship! 🚀**
