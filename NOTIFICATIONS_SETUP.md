# Email & SMS Notifications Setup Guide

Complete guide to configure email and SMS notifications for your CRM.

---

## 📧 Part 1: Resend Email Setup

### Step 1: Create Resend Account

1. **Sign up**: Go to https://resend.com/signup
2. **Verify your email**
3. **Log in** to your dashboard

### Step 2: Add Your Domain

1. Go to **Domains** → **Add Domain**
2. Enter: `cleandaycrm.com`
3. Click **Add**

### Step 3: Verify Domain with DNS Records

Resend will show you DNS records to add. You've already added these to Hostinger:

✅ **TXT Record** - Domain verification (already added)
✅ **MX Record** - Email receiving (already added)
✅ **TXT Record** - SPF for sending (already added)
✅ **TXT Record** - DMARC policy (already added)
✅ **TXT Record** - DKIM signing (already added with `resend._domainkey`)

**Wait 5-15 minutes** for verification to complete. The domain status will change to "Verified" ✅

### Step 4: Get Your API Key

1. In Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Name it: `Production - cleandaycrm.com`
4. **Copy the API key** - it starts with `re_`
5. **Save it securely** - you'll need it for Vercel

Example: `re_123abc456def789ghi`

---

## 📱 Part 2: Twilio SMS Setup

### Step 1: Create Twilio Account

1. **Sign up**: Go to https://www.twilio.com/try-twilio
2. **Verify your email and phone**
3. **Complete the onboarding**

### Step 2: Get a Phone Number

1. Go to **Phone Numbers** → **Manage** → **Buy a number**
2. **Select country**: United States
3. **Capabilities needed**:
   - ✅ SMS
   - ✅ Voice (optional)
4. **Search** for a number you like
5. **Buy the number** (usually $1-2/month)

Your number will look like: `+1 234 567 8900`

### Step 3: Get Your Credentials

1. Go to **Account** → **Keys & Credentials** (or Dashboard)
2. Copy these values:

   - **Account SID**: Starts with `AC...`
   - **Auth Token**: Click "View" to reveal it
   - **Phone Number**: The number you just bought (format: `+12345678900`)

Example format:
```
Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (starts with AC, 34 chars)
Auth Token: your_auth_token_32_characters_long
Phone Number: +12345678900
```

### Step 4: (Optional) Upgrade Account

**Trial limitations:**
- Can only send to verified phone numbers
- Messages include "Sent from a Twilio trial account"

**To remove limitations:**
1. Go to **Account** → **Billing**
2. **Upgrade your account**
3. Add payment method
4. Cost: ~$0.0079 per SMS in US

---

## 🔐 Part 3: Configure Vercel Environment Variables

### Step 1: Open Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your project: **awesome-crm**
3. Go to **Settings** → **Environment Variables**

### Step 2: Add Email Variables

Click **Add New** for each:

```bash
# Required - Base URL
NEXTAUTH_URL=https://cleandaycrm.com

# Required - Resend API Key
RESEND_API_KEY=re_your_actual_api_key_here

# Optional - Email Configuration (use defaults if not specified)
EMAIL_DOMAIN=cleandaycrm.com
EMAIL_FROM=noreply@cleandaycrm.com
EMAIL_FROM_ESTIMATES=estimates@cleandaycrm.com
EMAIL_FROM_BOOKINGS=bookings@cleandaycrm.com
EMAIL_FROM_NOTIFICATIONS=notifications@cleandaycrm.com
```

**For each variable:**
1. **Key**: Name (e.g., `RESEND_API_KEY`)
2. **Value**: Your actual value (e.g., `re_abc123...`)
3. **Environment**: Select **Production**, **Preview**, and **Development**
4. Click **Save**

### Step 3: Add Twilio Variables

```bash
# Required - Twilio Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx (copy from Twilio dashboard)
TWILIO_AUTH_TOKEN=your_auth_token_here (copy from Twilio dashboard)
TWILIO_PHONE_NUMBER=+12345678900
```

**Important**:
- Phone number must include `+` and country code
- No spaces or dashes: `+12345678900` ✅ not `+1 234-567-8900` ❌

### Step 4: Redeploy

After adding all environment variables:

1. Go to **Deployments** tab
2. Click **•••** (three dots) on latest deployment
3. Click **Redeploy**
4. Wait 2-3 minutes for deployment to complete

---

## ✅ Part 4: Testing

### Test 1: Create an Estimate

1. **Login**: Go to https://cleandaycrm.com/login
2. **Navigate**: Click "Estimates" in sidebar
3. **Create**: Click "New Estimate"
4. **Fill out form**:
   - Select or create a customer
   - Choose service type
   - Select square footage
   - Add service areas/addons
5. **Save**: Click "Save Estimate"

### Test 2: Send Estimate via Email

1. Go to **Estimates** list
2. Find your estimate
3. Click **Send** button
4. Select **Send via Email**
5. **Check**: Customer should receive email at their email address

**What to verify:**
- ✅ Email arrives within 1-2 minutes
- ✅ From address: `estimates@cleandaycrm.com`
- ✅ Subject: "Your Cleaning Estimate from [Company Name]"
- ✅ Email has proper formatting and estimate link

### Test 3: Send Estimate via SMS

1. Go to **Estimates** list
2. Find your estimate
3. Click **Send** button
4. Select **Send via SMS**
5. **Check**: Customer should receive text message

**What to verify:**
- ✅ SMS arrives within 10-30 seconds
- ✅ Message includes estimate link
- ✅ Link is clickable on mobile

### Test 4: Customer Accepts Estimate

1. **Open estimate link** from email/SMS
2. **Review** the estimate details
3. **Click** "Accept Estimate"
4. **Fill out**:
   - Name, email, phone
   - Credit card info
   - Optional: Create account
5. **Submit** booking
6. **Verify confirmations sent**:
   - ✅ Email confirmation received
   - ✅ SMS confirmation received
   - ✅ From `bookings@cleandaycrm.com`

---

## 🐛 Troubleshooting

### Email Issues

**Problem**: Emails not sending

**Check**:
1. ✅ Resend domain is verified (green checkmark in Resend dashboard)
2. ✅ `RESEND_API_KEY` is set correctly in Vercel
3. ✅ Customer has valid email address
4. ✅ Check Vercel logs for errors: Deployments → View Function Logs

**Problem**: Emails go to spam

**Fix**:
1. Wait 24-48 hours for DNS to fully propagate
2. Ensure all DNS records (SPF, DKIM, DMARC) are added
3. Send a few test emails - reputation improves over time
4. Ask recipients to mark as "Not Spam"

### SMS Issues

**Problem**: SMS not sending

**Check**:
1. ✅ Twilio account is active (not suspended)
2. ✅ Phone number format includes `+1`: `+12345678900`
3. ✅ Twilio credentials are correct in Vercel
4. ✅ You have SMS credits (check Twilio balance)

**Problem**: "Sent from trial account" message

**Fix**: Upgrade your Twilio account (see Part 2, Step 4)

**Problem**: Can only send to one phone number

**Fix**:
- Trial accounts can only send to verified numbers
- Upgrade to production account to send to any number

### Vercel Issues

**Problem**: Environment variables not working

**Fix**:
1. Check all variables are saved in Vercel Settings
2. Ensure they're enabled for "Production" environment
3. Redeploy after adding/changing variables
4. Wait 2-3 minutes for deployment to complete

**Problem**: Changes not showing on cleandaycrm.com

**Check**:
1. DNS has propagated (wait 10-30 minutes after DNS change)
2. Latest code is deployed (check Deployments tab)
3. Clear browser cache (Ctrl+Shift+R)
4. Check which branch is deployed (Settings → Git → Production Branch)

---

## 📊 Cost Breakdown

### Resend
- **Free tier**: 3,000 emails/month
- **Paid**: $20/month for 50,000 emails
- **Your usage**: ~100-500 emails/month estimated (well within free tier)

### Twilio
- **Phone number**: ~$1-2/month
- **SMS (US)**: ~$0.0079 per message
- **Your usage**: ~100-300 SMS/month = ~$2-3/month
- **Total**: ~$3-5/month

### Total Monthly Cost
**Estimated**: $3-5/month for notifications (stays in free tier for email)

---

## 🎯 Quick Reference

### Email Addresses Configured
- `estimates@cleandaycrm.com` - Sending estimates
- `bookings@cleandaycrm.com` - Booking confirmations
- `notifications@cleandaycrm.com` - General notifications
- `noreply@cleandaycrm.com` - Fallback

### Environment Variables Needed
```bash
NEXTAUTH_URL=https://cleandaycrm.com
RESEND_API_KEY=re_...
EMAIL_DOMAIN=cleandaycrm.com
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

### Testing URLs
- **Login**: https://cleandaycrm.com/login
- **Estimates**: https://cleandaycrm.com/estimates
- **New Estimate**: https://cleandaycrm.com/estimates/new
- **Vercel Dashboard**: https://vercel.com/dashboard

---

## ✅ Checklist

Use this to track your setup progress:

### Resend Setup
- [ ] Created Resend account
- [ ] Added cleandaycrm.com domain
- [ ] DNS records verified (green checkmark)
- [ ] Got API key
- [ ] Added API key to Vercel

### Twilio Setup
- [ ] Created Twilio account
- [ ] Bought phone number
- [ ] Got Account SID
- [ ] Got Auth Token
- [ ] Added credentials to Vercel

### Vercel Configuration
- [ ] Added NEXTAUTH_URL
- [ ] Added RESEND_API_KEY
- [ ] Added EMAIL_DOMAIN (optional)
- [ ] Added TWILIO_ACCOUNT_SID
- [ ] Added TWILIO_AUTH_TOKEN
- [ ] Added TWILIO_PHONE_NUMBER
- [ ] Redeployed application

### Testing
- [ ] Created test estimate
- [ ] Sent estimate via email
- [ ] Sent estimate via SMS
- [ ] Customer accepted estimate
- [ ] Received booking confirmation email
- [ ] Received booking confirmation SMS

---

## 🚀 You're All Set!

Once you complete this checklist, your notification system will be fully operational. Customers will receive professional emails and SMS messages for estimates and booking confirmations!

**Need help?** Check the Troubleshooting section or Vercel function logs for error details.
