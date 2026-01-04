# ☁️ Cloud-Only Deployment Guide

Deploy AwesomeCRM **without using your local terminal** - everything from the browser!

## 🎯 What You'll Use

- ✅ **GitHub** - Code hosting (already done!)
- ✅ **Vercel** - App hosting (free)
- ✅ **Neon** - PostgreSQL database (free)
- ✅ **Online tools** - Generate secrets in browser

---

## 📝 Step 1: Create Database (5 min)

### Sign up for Neon

1. Go to **https://neon.tech**
2. Click **"Sign up"** → Use GitHub to sign in
3. Click **"Create a project"**
4. Name: `awesomecrm-db`
5. Select region closest to you
6. Click **"Create Project"**

### Get Connection String

1. After creation, you'll see **"Connection Details"**
2. Copy the **Connection string**
   - Should look like: `postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb`
3. **IMPORTANT:** Add `?sslmode=require` to the end
   - Final format: `postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require`
4. Save this in a notepad - you'll need it soon!

---

## 🔐 Step 2: Generate Secrets (2 min)

Open these links in new tabs to generate random secrets:

1. **NEXTAUTH_SECRET**: https://generate-secret.vercel.app/32
   - Copy the generated secret → Save it
2. **CRON_SECRET**: https://generate-secret.vercel.app/32
   - Copy the generated secret → Save it

---

## 🚀 Step 3: Deploy to Vercel (10 min)

### Import Project

1. Go to **https://vercel.com**
2. Click **"Sign Up"** → Use GitHub
3. Click **"Add New..."** → **"Project"**
4. Find **"AwesomeCRM"** → Click **"Import"**

### Add Environment Variables

**BEFORE clicking Deploy**, scroll down to **"Environment Variables"**

Add these one by one (click "+ Add Another" after each):

#### Required Variables:

| Name | Value |
|------|-------|
| `DATABASE_URL` | `postgresql://...?sslmode=require` (from Step 1) |
| `NEXTAUTH_URL` | `https://your-project.vercel.app` (replace with your Vercel URL - see below) |
| `NEXTAUTH_SECRET` | Paste secret from Step 2 #1 |
| `CRON_SECRET` | Paste secret from Step 2 #2 |

**For NEXTAUTH_URL:**
- Before deploying, Vercel shows your domain at the top: `your-project-xyz.vercel.app`
- Copy it and add `https://` in front
- Example: `https://awesome-crm-abc123.vercel.app`

#### Optional (Add Later):

For now, add **dummy values** so the build succeeds:

| Name | Value |
|------|-------|
| `STRIPE_SECRET_KEY` | `sk_test_dummy` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_dummy` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_dummy` |
| `TWILIO_ACCOUNT_SID` | `AC_dummy` |
| `TWILIO_AUTH_TOKEN` | `dummy` |
| `TWILIO_PHONE_NUMBER` | `+10000000000` |

### Deploy!

1. Click **"Deploy"**
2. Wait 2-3 minutes for build
3. You'll see **"Congratulations!"** 🎉
4. Click **"Continue to Dashboard"**

---

## 🗄️ Step 4: Setup Database (5 min)

We need to run migrations to create database tables. Since you don't want to use terminal, we'll use Vercel's build process.

### Create Migration Script

1. Go to your **GitHub repository** page
2. Navigate to `package.json`
3. Click the **pencil icon** (Edit)
4. Find the `"scripts"` section (around line 5-10)
5. Add this line after `"build": "next build",`:
   ```json
   "vercel-build": "prisma generate && prisma migrate deploy && next build",
   ```
6. Scroll down → Click **"Commit changes"**
7. Add commit message: `Add database migration to build`
8. Click **"Commit changes"**

### Trigger Redeploy

1. Go back to **Vercel dashboard**
2. Your project will auto-deploy from the GitHub push (wait ~2 min)
3. OR manually: Click **"Deployments"** → Latest deployment → **"Redeploy"**

✅ **Database is now set up!**

---

## ✅ Step 5: Test Your App (5 min)

### Visit Your App

1. In Vercel dashboard, click **"Visit"** button
2. Your app should load at `https://your-project.vercel.app`

### Create Account

1. Click **"Sign Up"**
2. Enter:
   - Email: your email
   - Password: create a strong password
   - Name: Your name
   - Phone: Your phone number
   - Business: Your business name
3. Click **"Create Account"**

✅ **You should see the Calendar page!**

### Add Test Client

1. Click **"Clients"** in navigation
2. Click **"New Client"**
3. Fill in details:
   - Name: "Test Client"
   - Email: test@example.com
   - Phone: +1234567890
   - Add an address
4. Click **"Create Client"**

✅ **If this works, your app is running successfully!**

---

## 💳 Step 6: Setup Stripe (Optional - 10 min)

### Get Stripe Keys

1. Go to **https://stripe.com** → Sign up
2. Stay in **"Test Mode"** (toggle in top right)
3. Go to **"Developers"** → **"API keys"**
4. Copy:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (click to reveal, starts with `sk_test_`)

### Setup Webhook

1. Go to **"Developers"** → **"Webhooks"**
2. Click **"Add endpoint"**
3. Endpoint URL: `https://your-project.vercel.app/api/payments/webhook`
4. Click **"Select events"** → Choose:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
5. Click **"Add events"** → **"Add endpoint"**
6. Copy the **"Signing secret"** (starts with `whsec_`)

### Update Vercel Environment Variables

1. Go to Vercel → Your Project → **"Settings"** → **"Environment Variables"**
2. Find and edit these variables:
   - `STRIPE_SECRET_KEY` → Paste your secret key
   - `STRIPE_PUBLISHABLE_KEY` → Paste your publishable key
   - `STRIPE_WEBHOOK_SECRET` → Paste your webhook secret
3. Click **"Save"** for each

### Redeploy

1. Go to **"Deployments"** tab
2. Click **"..."** on latest deployment → **"Redeploy"**
3. Wait for deployment to complete

✅ **Stripe payments now work!**

---

## 📱 Step 7: Setup Twilio SMS (Optional - 10 min)

### Get Twilio Credentials

1. Go to **https://twilio.com/try-twilio** → Sign up
2. Verify your phone number
3. You get **$15 free credit**
4. Go to **Console** → Copy:
   - **Account SID** (starts with `AC`)
   - **Auth Token** (click to reveal)

### Get Phone Number

1. Click **"Get a trial phone number"**
2. Accept the suggested number
3. Copy the number (format: `+15551234567`)

### Update Vercel

1. Go to Vercel → Settings → Environment Variables
2. Edit:
   - `TWILIO_ACCOUNT_SID` → Paste Account SID
   - `TWILIO_AUTH_TOKEN` → Paste Auth Token
   - `TWILIO_PHONE_NUMBER` → Paste phone number
3. **Redeploy** from Deployments tab

✅ **SMS reminders now work!**

**Note:** Trial accounts can only send to verified numbers. Upgrade to send to anyone.

---

## 🎉 You're Live!

Your app is now running at: `https://your-project.vercel.app`

### What Works:
- ✅ Client management
- ✅ Job scheduling
- ✅ Calendar view
- ✅ Payment tracking
- ✅ Stripe payments (if configured)
- ✅ SMS reminders (if configured)
- ✅ Auto-deployments from GitHub

### Auto-Deployments

Every time you push to GitHub, Vercel automatically deploys:

```
Push to GitHub → Vercel detects change → Auto-builds → Auto-deploys
```

---

## 🔧 Troubleshooting

### Build Failed

**Check logs:**
1. Vercel → Deployments → Click failed deployment
2. Click **"Building"** to see error logs

**Common fixes:**
- Verify all environment variables are set
- Check `DATABASE_URL` has `?sslmode=require` at the end
- Redeploy after fixing

### Can't Connect to Database

1. Go to Neon dashboard → Check database is not paused
2. Verify `DATABASE_URL` is correct in Vercel
3. Make sure it ends with `?sslmode=require`

### 500 Error When Signing Up

1. Check Vercel logs: Deployments → Latest → **"Functions"** tab
2. Verify `NEXTAUTH_SECRET` is set
3. Verify `NEXTAUTH_URL` matches your Vercel domain
4. Redeploy

### Payments Not Working

1. Verify Stripe keys are from **Test Mode**
2. Check webhook URL matches your Vercel domain
3. Test with card: `4242 4242 4242 4242`
4. Check Stripe logs: Dashboard → Developers → Events

---

## 📊 Monitor Your App

### Vercel Dashboard

- **Deployments**: See all deploys and their status
- **Logs**: Real-time function logs
- **Analytics**: Page views and performance (enable in settings)

### Neon Dashboard

- **Monitoring**: Database size, connections, queries
- **SQL Editor**: Run queries directly

### Stripe Dashboard

- **Payments**: See all test payments
- **Logs**: Webhook events and errors
- **Developers → Events**: All API events

---

## 🚀 Next Steps

1. **Customize** message templates in Settings
2. **Test** the full workflow: client → job → payment
3. **Invite** beta users to test
4. **Monitor** Vercel logs for errors
5. **Switch to Stripe Live Mode** when ready for real payments

---

## 💰 Costs (All Free Tiers)

| Service | Free Tier |
|---------|-----------|
| **Vercel** | Unlimited deployments, 100GB bandwidth/month |
| **Neon** | 512MB database, 1 project |
| **Stripe** | Unlimited test transactions, live: 2.9% + 30¢ |
| **Twilio** | $15 trial credit, then ~$0.0075/SMS |

---

## 🎯 Pro Tips

1. **Custom Domain**: Vercel → Settings → Domains (buy from Vercel or use existing)
2. **Environment Secrets**: Never commit `.env` files to GitHub
3. **Test Everything**: Use Stripe test cards before going live
4. **Monitor Logs**: Check Vercel logs daily for errors
5. **Database Backups**: Neon free tier has basic backups

---

**Questions or issues?** Check the main README.md or open a GitHub issue.

**🎉 Congrats - you deployed without touching your terminal!**
