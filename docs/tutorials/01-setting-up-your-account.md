# Tutorial: Setting Up Your Account

This tutorial walks you through initial account setup and configuration for a new cleaning company on CleanDayCRM.

---

## 1. Create Your Account

1. Go to **cleandaycrm.com** and click **Sign Up**.
2. Fill in:
   - **Business Name**: Your company name as you want customers to see it.
   - **Your Name**: The owner's full name.
   - **Email**: The email you will use to log in.
   - **Password**: A strong password (8+ characters recommended).
3. Click **Create Account**.

You are now logged in as the **Owner** of your new company workspace.

---

## 2. Set Up Company Profile

Navigate to **Settings** from the sidebar.

### Basic Info
- Verify your **Company Name**.
- Add your **Company Email** and **Phone Number**.
- Add your **Business Address**.

### Branding
- Upload your **Company Logo** (displayed on invoices, estimates, and the booking page).
- Set your **Primary Color** (used throughout the customer-facing interface).

### Locale
- Set your **Timezone** (all job times are displayed in this timezone).
- Set your **Currency** (default: USD).

---

## 3. Configure Business Type

Still in Settings, set your **Business Type**:
- **Residential** -- homes, apartments, condos
- **Commercial** -- offices, retail spaces
- **Both** -- if you offer both

This affects how certain features and reports are categorized.

---

## 4. Set Up Pricing

### Base Rate
Set your **Hourly Rate** (e.g., $50/hr). This is your starting point for pricing jobs.

### Service Multipliers
Configure multipliers for different service types:
| Service Type | Multiplier | Effective Rate (at $50/hr) |
|-------------|-----------|---------------------------|
| Standard | 1.0x | $50/hr |
| Deep Clean | 1.2x | $60/hr |
| Move-Out | 1.2x | $60/hr |
| Weekly Recurring | 0.75x | $37.50/hr |
| Biweekly Recurring | 0.85x | $42.50/hr |
| Monthly Recurring | 0.9x | $45/hr |

### Pricing Rules (Optional)
For more granular pricing, go to **Settings > Pricing** and create rules:
- **By Bedroom Count**: Set fixed prices for studio, 1-bed, 2-bed, etc.
- **By Bathroom Count**: Set prices for 1 bath, 1.5 bath, 2 bath, etc.
- **Add-Ons**: Extra services like pet hair removal, inside fridge, inside oven, etc.

---

## 5. Set Up Payment Integrations

### Stripe (Recommended)
Stripe enables credit card payments through payment links and auto-charging.

1. Create a Stripe account at [stripe.com](https://stripe.com) (free to create; fees are per transaction).
2. In your Stripe Dashboard, go to **Developers > API Keys**.
3. Copy your **Secret Key** and **Publishable Key**.
4. In CleanDayCRM, go to **Settings** and paste both keys.
5. Set up a **Webhook**:
   - In Stripe: **Developers > Webhooks > Add Endpoint**
   - URL: `https://cleandaycrm.com/api/payments/webhook`
   - Events: select `payment_intent.succeeded` and `checkout.session.completed`
   - Copy the **Webhook Signing Secret** and paste it in CleanDayCRM Settings.

### Alternative Payment Methods
Add your payment details so customers know how to pay:
- **Zelle Email**
- **Venmo Username** (include the @ symbol)
- **CashApp Username** (include the $ symbol)

---

## 6. Set Up SMS (Optional)

Twilio enables automated text messages (confirmations, reminders, "on my way" notifications).

1. Create a Twilio account at [twilio.com](https://www.twilio.com).
2. Get a phone number (Twilio will guide you through this).
3. In your Twilio Console, find your **Account SID** and **Auth Token**.
4. In CleanDayCRM Settings, enter:
   - **Twilio Account SID**
   - **Twilio Auth Token**
   - **Twilio Phone Number** (with country code, e.g., +15551234567)

> Twilio is optional. Without it, SMS features are disabled but everything else works.

---

## 7. Configure Reminders

In Settings, under **Reminders**:
- **Customer Reminders**: Enable and set how many hours before the appointment to send (default: 24 hours).
- **Cleaner Reminders**: Enable and set the timing (default: 24 hours).
- **Morning-Of Reminder**: Enable to send cleaners a reminder on the morning of their jobs (default: 8:00 AM).

---

## 8. Configure Online Booking

Under **Online Booking**:
- **Enable Online Booking** -- turn on your public booking page.
- **Minimum Lead Time** -- how many hours in advance customers must book (default: 2 hours).
- **Max Days Ahead** -- how far out they can book (default: 60 days).
- **Require Approval** -- toggle on if you want to review every booking before confirming.

Your public booking page is at: `cleandaycrm.com/your-company-slug`

---

## 9. Add Review Links

Add your review page URLs so the system can send review requests after cleanings:
- **Google Review URL** -- your Google Business review link
- **Yelp Review URL** -- your Yelp Business review link

---

## 10. Verify Everything

Run through this checklist:
- [ ] Company name and contact info are correct
- [ ] Logo is uploaded
- [ ] Pricing is configured
- [ ] Stripe keys are entered (if using card payments)
- [ ] Twilio credentials are entered (if using SMS)
- [ ] Reminder settings are configured
- [ ] Online booking is configured
- [ ] Review links are added

You are ready to start adding clients and scheduling jobs.

---

## Next Steps

- [Managing Clients](./02-managing-clients.md) -- add your first clients
- [Scheduling Jobs](./03-scheduling-jobs.md) -- book your first cleaning
- [Team Management](./05-team-management.md) -- invite your staff
