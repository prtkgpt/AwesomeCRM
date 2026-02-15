# Getting Started with CleanDayCRM

Welcome to CleanDayCRM -- the all-in-one platform built for cleaning companies. This guide walks you through setting up your account, configuring your business, and getting your first job scheduled.

---

## Step 1: Create Your Company Account

1. Visit **cleandaycrm.com** and click **Sign Up**.
2. Enter your details:
   - **Business Name** -- e.g., "Sparkle Clean Services"
   - **Your Name** -- the account owner's name
   - **Email** -- your login email
   - **Password** -- choose a strong password
3. Click **Create Account**.

Your company workspace is created automatically. You are assigned the **Owner** role, which gives you full access to every feature.

> Your company gets a unique URL slug based on your business name (e.g., `cleandaycrm.com/sparkle-clean-services`). Customers use this link to book services online.

---

## Step 2: Configure Company Settings

After signing in, navigate to **Settings** from the sidebar.

### Basic Information
- **Company Name** and **Contact Info** (email, phone, address)
- **Logo** and **Primary Color** for branding
- **Timezone** and **Currency**

### Business Type
Select whether you service **Residential**, **Commercial**, or both.

### Pricing Configuration
- Set your **base hourly rate** (default: $50/hr)
- Configure **service type multipliers** for Deep Clean, Move-Out, etc.
- Set up **pricing rules** by bedroom count, bathroom count, and add-ons

### Online Booking
- **Enable/disable** online booking through your public page
- Set **minimum lead time** (how far in advance customers must book)
- Set **max days ahead** (how far out customers can book)
- Toggle **manual approval** if you want to review bookings before confirming

### Reminders
- Enable **customer reminders** (sent X hours before appointment)
- Enable **cleaner reminders** (sent X hours before appointment)
- Configure **morning-of reminders** for your cleaning staff

### Payment Links
- Add your **Google Review URL** and **Yelp Review URL** for post-service review requests
- Add payment options: **Zelle email**, **Venmo username**, **CashApp username**

### Integrations (Optional)
- **Stripe** -- for credit card payments and invoicing
- **Twilio** -- for automated SMS messages
- **Resend** -- for email notifications

---

## Step 3: Add Your First Client

Navigate to **Clients** in the sidebar.

1. Click **New Client**.
2. Fill in the client's info:
   - **Name** (required)
   - **Email** and **Phone** (optional but recommended for messaging)
   - **Tags** -- label clients for easy filtering (e.g., "VIP", "Weekly", "Insurance")
   - **Notes** -- any general notes about this client
3. Add at least one **Address**:
   - Street, City, State, Zip
   - **Property details**: type (house, condo, apartment), square footage, bedrooms, bathrooms
   - **Cleaner notes**: parking info, gate code, pet info, entry preferences
4. Click **Save**.

---

## Step 4: Schedule Your First Job

Navigate to **Calendar** or **Jobs** in the sidebar.

1. Click **New Job**.
2. Select the **Client** from the dropdown (or create a new one).
3. Select the client's **Address**.
4. Set the **Date and Time**.
5. Set the **Duration** (in minutes).
6. Choose the **Service Type**: Standard, Deep Clean, or Move-Out.
7. Set the **Price**.
8. (Optional) Toggle **Recurring** and choose the frequency: Weekly, Biweekly, or Monthly.
9. (Optional) **Assign a cleaner** from your team.
10. Click **Create Job**.

The job appears on your calendar. If you have reminders enabled, SMS notifications are sent automatically.

---

## Step 5: Invite Your Team

Navigate to **Team** in the sidebar.

1. Click **Invite Team Member**.
2. Enter their **email address**.
3. Select their **role**:
   - **Admin** -- office staff with full access to manage operations
   - **Cleaner** -- field workers who see only their assigned jobs
4. Click **Send Invitation**.

The team member receives an email with a unique link. When they accept, their account is created automatically and they are logged in.

---

## Step 6: Set Up Payments

### Stripe (Credit Card Payments)
1. Go to **Settings** and add your Stripe API keys.
2. When a job is completed, you can send a **payment link** to the customer via SMS.
3. The customer pays on their phone; the system automatically marks the job as paid.

### Manual Payments
For cash, check, or Zelle payments:
1. Open the completed job.
2. Click **Mark as Paid**.
3. Select the payment method.

---

## What's Next?

Now that you're set up, explore these guides:

- **[Owner/Admin Guide](./owner-admin-guide.md)** -- deep dive into every dashboard feature
- **[Cleaner Guide](./cleaner-guide.md)** -- share this with your cleaning staff
- **[Customer Portal Guide](./customer-portal-guide.md)** -- share this with your customers
- **[Tutorials](./tutorials/)** -- step-by-step walkthroughs for specific tasks
- **[FAQ](./faq.md)** -- answers to common questions

---

## Need Help?

- Email: support@cleandaycrm.com
- Use the in-app support options
- Check the [FAQ](./faq.md) for quick answers
