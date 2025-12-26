# Setting Up CleanDayCRM.com

## 🎉 Complete Rebrand Done!

Your app is now **CleanDayCRM** throughout:
- ✅ Landing page
- ✅ Login/Signup pages
- ✅ Settings page
- ✅ Page titles and SEO

All changes committed to: `claude/cleaner-crm-mvp-U4IAD`

---

## 📍 Buy the Domain (5 minutes)

### Option 1: Namecheap (Recommended - $10/year)

1. Go to https://www.namecheap.com
2. Search for: `cleandaycrm.com`
3. Add to cart
4. Checkout (around $10-12 for first year)
5. **Disable auto-renew protection** (saves ~$3/year)

### Option 2: Google Domains → Squarespace ($12/year)

1. Go to https://domains.google
2. Search and buy `cleandaycrm.com`

### Option 3: Vercel Domains ($15/year)

1. In Vercel dashboard → Domains
2. Search for `cleandaycrm.com`
3. Buy directly (easiest setup!)

---

## 🔗 Connect Domain to Vercel (10 minutes)

### If you bought from Namecheap or Google:

#### Step 1: Add Domain in Vercel

1. Go to your Vercel project
2. Click **Settings** → **Domains**
3. Enter: `cleandaycrm.com`
4. Click **Add**
5. Also add: `www.cleandaycrm.com`

#### Step 2: Update DNS Records at Namecheap

Vercel will show you which DNS records to add. Typically:

**For cleandaycrm.com (apex domain):**
- Type: `A`
- Host: `@`
- Value: `76.76.21.21` (Vercel's IP)

**For www.cleandaycrm.com:**
- Type: `CNAME`
- Host: `www`
- Value: `cname.vercel-dns.com`

**To configure in Namecheap:**
1. Log in to Namecheap
2. Go to **Domain List**
3. Click **Manage** next to cleandaycrm.com
4. Click **Advanced DNS**
5. Add the records above
6. Delete any existing A or CNAME records

#### Step 3: Wait for DNS Propagation

- Usually takes 5-30 minutes
- Can take up to 48 hours
- Check status at: https://dnschecker.org

#### Step 4: Enable HTTPS

1. Once DNS is verified, go to Vercel Domains
2. Click **Enable HTTPS**
3. Vercel auto-generates SSL certificate
4. Your site will be live at https://cleandaycrm.com

### If you bought from Vercel:

**Much simpler!**
1. Domain is auto-connected
2. DNS is pre-configured
3. HTTPS enabled automatically
4. Live in ~5 minutes

---

## ⚙️ Update Environment Variables (5 minutes)

Once your domain is live:

### 1. Update NEXTAUTH_URL

In Vercel:
1. Go to **Settings** → **Environment Variables**
2. Find `NEXTAUTH_URL`
3. Update to: `https://cleandaycrm.com`
4. Click **Save**

### 2. Update Stripe Webhook URL

In Stripe Dashboard:
1. Go to **Developers** → **Webhooks**
2. Click on your webhook
3. Update URL to: `https://cleandaycrm.com/api/payments/webhook`
4. Save

### 3. Update Twilio Callback (if using SMS)

In Twilio Console:
1. Go to your phone number settings
2. Update webhook URL to: `https://cleandaycrm.com/api/messages/webhook`
3. Save

### 4. Redeploy

In Vercel:
1. Go to **Deployments** tab
2. Click **...** on latest deployment
3. Click **Redeploy**
4. Wait ~2 minutes

---

## ✅ Verification Checklist

Test everything works on your new domain:

- [ ] Visit https://cleandaycrm.com - landing page loads
- [ ] Landing page is mobile-responsive
- [ ] Click "Sign Up" - goes to signup page
- [ ] Create test account - redirects to calendar
- [ ] Add test client - works correctly
- [ ] Create test job - appears on calendar
- [ ] Request payment - Stripe link generated
- [ ] Check Stripe webhook - receiving events
- [ ] Send test SMS - delivered (if using Twilio)
- [ ] HTTPS padlock shows in browser
- [ ] www.cleandaycrm.com redirects to cleandaycrm.com

---

## 🎨 Optional: Add Favicon

Make your app look professional in browser tabs:

### 1. Create Favicon

Use a free tool like:
- https://favicon.io (easiest)
- https://realfavicongenerator.net (most options)

Upload a logo or use the Calendar icon from your landing page.

### 2. Add to Project

Save these files to `/public/`:
- `favicon.ico` (16x16, 32x32)
- `apple-touch-icon.png` (180x180)
- `favicon-16x16.png`
- `favicon-32x32.png`

### 3. Update Layout

In `/src/app/layout.tsx`, add to metadata:

```tsx
export const metadata: Metadata = {
  title: "CleanDayCRM - Simple CRM for Home Cleaners",
  description: "Calendar, clients, payments, and reminders for independent home cleaners",
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  // ... rest of metadata
};
```

---

## 📊 Optional: Add Google Analytics

Track visitors to your landing page:

### 1. Create GA4 Property

1. Go to https://analytics.google.com
2. Create account
3. Create GA4 property for `cleandaycrm.com`
4. Copy your Measurement ID (looks like `G-XXXXXXXXXX`)

### 2. Add to Project

Create `/src/app/analytics.tsx`:

```tsx
import Script from 'next/script';

export function Analytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-XXXXXXXXXX');
        `}
      </Script>
    </>
  );
}
```

### 3. Add to Layout

In `/src/app/layout.tsx`:

```tsx
import { Analytics } from './analytics';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
```

---

## 🚀 Launch Checklist

Before sharing your domain publicly:

### Technical
- [ ] Domain connected and HTTPS working
- [ ] Environment variables updated
- [ ] Stripe webhook tested
- [ ] SMS sending tested (if using Twilio)
- [ ] Mobile responsive verified
- [ ] All CTAs working

### Content
- [ ] Landing page copy reviewed
- [ ] Testimonials updated (or placeholders OK)
- [ ] Pricing correct
- [ ] Contact info correct

### Legal (Optional for MVP)
- [ ] Privacy policy added
- [ ] Terms of service added
- [ ] Cookie notice (if using analytics)

### Marketing
- [ ] Social media accounts created
- [ ] First posts ready
- [ ] Email templates ready
- [ ] Beta customer list ready

---

## 📢 Announce Your Launch!

Share your beautiful new domain:

### Social Media Posts

**Twitter/X:**
```
🚀 Excited to launch CleanDayCRM!

A simple CRM built specifically for home cleaners:
✅ Book jobs in 30 seconds
✅ Get paid via text
✅ Auto SMS reminders
✅ Just $10/month

Try free for 14 days: cleandaycrm.com

#CleaningBusiness #SaaS
```

**Instagram:**
```
Finally! A CRM that actually works for cleaners 🧹

✨ cleandaycrm.com ✨

No more juggling:
📱 Texts
📝 Notes
📊 Spreadsheets

Everything in one place, on your phone.

Link in bio to try it free for 14 days!

#cleaningbusiness #cleaningservices #entrepreneur #smallbusiness
```

**LinkedIn:**
```
I'm excited to launch CleanDayCRM - a mobile-first CRM designed specifically for independent home cleaners.

After talking to dozens of cleaners, I learned they needed:
• Fast booking (under 30 seconds)
• Payment collection via text
• Automated reminders
• Something that works on a phone

CleanDayCRM delivers all of this for just $10/month.

If you know any independent cleaners, I'd love for them to try it:
cleandaycrm.com

14-day free trial, no credit card required.
```

### Facebook Groups

Post in:
- Cleaning business groups
- Entrepreneur groups
- Small business groups
- Local community groups

**Template:**
```
Hey everyone! 👋

I just launched CleanDayCRM - a simple CRM for home cleaners.

It's specifically built for solo cleaners and small teams who:
• Book clients via text/Instagram
• Want to get organized
• Need to track payments
• Don't want complicated software

Key features:
📅 Smart calendar
💰 Payment links via SMS
🔔 Auto reminders
📱 Works on your phone

Try it free for 14 days (no credit card needed):
cleandaycrm.com

Would love your feedback!
```

---

## 📈 Track Your Success

### Week 1 Goals
- [ ] 10+ landing page visitors
- [ ] 2-3 signups
- [ ] 1-2 active users

### Week 2 Goals
- [ ] 50+ landing page visitors
- [ ] 5-10 signups
- [ ] Get first testimonial

### Month 1 Goals
- [ ] 100+ landing page visitors
- [ ] 10-15 signups
- [ ] 5+ paying customers ($50+ MRR)

### Track These Metrics
1. **Landing page conversion** (visitors → signups)
2. **Activation rate** (signups → add client)
3. **Retention** (users active after 7 days)
4. **Revenue** (monthly recurring)

---

## 🎉 You're Live!

**Your URLs:**
- Landing page: https://cleandaycrm.com
- Login: https://cleandaycrm.com/login
- Signup: https://cleandaycrm.com/signup
- App: https://cleandaycrm.com/calendar

**Next steps:**
1. Share on social media
2. Post in Facebook groups
3. Email 5-10 cleaners you know
4. Get your first 3 customers
5. Iterate based on feedback

---

## 💡 Pro Tips

### For Landing Page
- Add live chat (Crisp or Intercom)
- A/B test headlines
- Add video demo
- Collect emails for newsletter

### For Growth
- Offer referral bonus ($5 off)
- Partner with cleaning supply stores
- Sponsor local cleaner meetups
- Create cleaning business blog

### For Product
- Watch users with Hotjar
- Ask for feedback constantly
- Fix bugs immediately
- Ship weekly improvements

---

**🚀 CleanDayCRM.com is ready to ship!**

You've got:
✅ Beautiful domain
✅ Rebranded app
✅ Production-ready code
✅ Complete documentation

**Time to get customers!** 🎉
