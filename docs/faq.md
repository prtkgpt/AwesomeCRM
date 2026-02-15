# Frequently Asked Questions (FAQ)

---

## Account & Setup

### How do I create my company account?
Go to cleandaycrm.com and click **Sign Up**. Enter your business name, name, email, and password. Your company workspace is created instantly and you are logged in as the Owner. See the [Getting Started guide](./getting-started.md) for the full setup walkthrough.

### Can I change my company name or URL slug after signing up?
Yes. Go to **Settings** and update your company name. The URL slug can be changed there as well, but keep in mind that any existing links (booking pages, estimates) using the old slug will stop working.

### What roles are available?
There are four roles:
- **Owner** -- full access, company creator
- **Admin** -- full operational access (manage clients, jobs, team, invoices)
- **Cleaner** -- view and complete assigned jobs only
- **Customer** -- view bookings, pay invoices, manage preferences

### Can I have multiple Owners?
No, each company has one Owner. However, you can have multiple Admins who have nearly identical access.

### How do I change someone's role?
Go to **Team**, find the member, and update their role. Note that you cannot change someone to or from the Owner role directly.

---

## Clients

### How many clients can I have?
There is no limit on the number of clients.

### Can a client have multiple addresses?
Yes. Add as many addresses as needed. When creating a job, you select which address to use.

### What are tags and how should I use them?
Tags are labels you attach to clients for filtering and organization. Common tags include "VIP", "Weekly", "Biweekly", "Monthly", "Insurance", "Cash", "New", "Inactive". Use them consistently to quickly find and segment clients.

### How do I import existing clients?
Currently, clients are added manually through the Clients page. Bulk import via CSV is on the roadmap.

### What happens when I delete a client?
Deleting a client permanently removes their profile, addresses, bookings, and invoices. This cannot be undone. If you might need the data later, tag the client as "Inactive" instead.

### Can clients create their own accounts?
Yes. When you invite a client or they sign up through your online booking page, they get a Customer account. They can log in to view their bookings, pay invoices, and manage preferences.

---

## Jobs & Scheduling

### What service types are available?
Three built-in types: **Standard**, **Deep Clean**, and **Move-Out**. Each can have different pricing multipliers.

### How does recurring scheduling work?
When creating a job, toggle Recurring and select a frequency (Weekly, Biweekly, or Monthly). The system generates future instances automatically. You can manage the series from the Subscriptions page.

### Can I pause a recurring schedule?
Yes. Go to **Subscriptions**, find the series, and click **Pause**. No new instances are generated until you **Resume**.

### How does the two-stage completion workflow work?
1. The cleaner marks the job as **Cleaner Completed** from their portal.
2. The admin reviews and clicks **Approve**, changing status to **Completed**.
3. Payment can then be processed.

This gives you quality control before charging the customer.

### Can I schedule jobs without assigning a cleaner?
Yes. You can create unassigned jobs and assign a cleaner later.

### How far in advance can customers book online?
This is configurable in **Settings > Online Booking > Max Days Ahead** (default: 60 days).

### What is the minimum lead time for online bookings?
Configurable in **Settings > Online Booking > Minimum Lead Time** (default: 2 hours).

### Does the calendar detect scheduling conflicts?
The calendar displays all jobs for a given day. You should review existing assignments before scheduling to avoid overlaps.

---

## Payments

### What payment methods do you support?
- **Credit/debit card** via Stripe
- **Zelle**
- **Venmo**
- **CashApp**
- **Cash**
- **Check**

Stripe is the only method that automates payment tracking. For all others, you manually mark jobs as paid.

### How do payment links work?
When you click **Request Payment** on a completed job, the system creates a Stripe payment link and sends it to the customer via SMS. The customer taps the link, pays, and the job is automatically marked as paid.

### What is auto-charge?
If a client has a saved payment method (credit card) and you enable auto-charge on their profile, the system automatically charges their card after a job is completed and approved. They receive a receipt.

### How does insurance billing work?
For clients with insurance (e.g., Helper Bee's), the booking tracks the insurance amount and copay separately. The insurance company pays their portion, and the client pays the copay. You mark each portion as paid independently.

### How do referral credits work with payments?
When a client has referral credits, the credits are applied to the booking price. The Final Price reflects the remaining amount after credits. Any balance is collected via normal payment methods.

### Can I issue refunds?
Refunds are processed through your Stripe dashboard. CleanDayCRM does not currently have a built-in refund button, but you can adjust booking prices and mark payments accordingly.

---

## Team Management

### How do I invite a cleaner?
Go to **Team > Invite Team Member**, enter their email, select the **Cleaner** role, and click **Send Invitation**. They receive an email with a signup link.

### What if the invitation expires?
Invitations expire after 7 days. Simply send a new invitation from the Team page.

### What can cleaners see?
Cleaners only see:
- Jobs assigned to them (today and upcoming 7 days)
- Their performance stats (ratings, jobs completed, hours worked)
- Their own profile

They cannot see other cleaners' jobs, client lists, invoices, or company settings.

### How do I track cleaner hours?
Cleaners clock in when they arrive at a job and clock out when they finish. These timestamps are recorded on each booking. You can view total hours from their performance dashboard.

### Can I deactivate a team member without deleting them?
Yes. Toggle their **Active** status off in their profile. They cannot log in, but their historical data is preserved.

### How do I pay my cleaners?
Use the **Pay Logs** feature on each team member's profile to record paychecks, supplies reimbursements, and gas reimbursements. CleanDayCRM does not process payroll directly -- it tracks what you owe and have paid.

---

## SMS & Messaging

### Do I need Twilio for SMS?
Twilio is required for all SMS features (confirmations, reminders, "on my way" notifications, payment links, campaigns). Without Twilio, SMS is disabled but all other features work normally.

### How much does Twilio cost?
Twilio charges per message sent (approximately $0.0079 per SMS in the US). You pay Twilio directly. CleanDayCRM does not charge extra for SMS.

### Can I customize the message templates?
Yes. Go to **Settings** and edit any template. Use variables like `{{clientName}}`, `{{date}}`, `{{time}}`, `{{price}}`, `{{businessName}}`, and `{{paymentLink}}`.

### Are reminders sent automatically?
Yes, if you have Twilio configured and reminders enabled in Settings. The system checks hourly and sends reminders at the configured time before each appointment.

### Can clients opt out of marketing messages?
Yes. Set the **Marketing Opt-Out** flag on a client's profile. They will be excluded from campaigns. Operational messages (confirmations, reminders, payment links) are still sent.

---

## Online Booking

### How do customers book online?
Share your booking page URL (`cleandaycrm.com/your-company-slug`) with potential customers. They select a service type, date/time, and enter their details.

### Can I require manual approval for online bookings?
Yes. Toggle **Require Approval** in **Settings > Online Booking**. New online bookings will have a "Pending Approval" status until you approve them.

### Is the customer's card charged immediately when they book online?
No. The card is pre-authorized (a temporary hold) but not charged until after the cleaning is completed and approved. If you reject the booking, the hold is released.

### Can I customize the booking page appearance?
The booking page uses your company logo and primary color. Additional design customization is on the roadmap.

---

## Estimates

### How do estimates work?
Create a booking with estimated pricing, then generate a shareable estimate link. The customer views the estimate on a branded page and can accept it to confirm the booking.

### Do estimates expire?
Estimate links remain active until the customer accepts or you cancel the booking.

---

## Invoices

### Are invoice numbers generated automatically?
Yes. Each invoice gets a unique auto-generated number.

### Can I customize invoice templates?
You can add your company logo, set payment terms, and include custom notes. Additional template customization is on the roadmap.

### How do I handle overdue invoices?
Invoices past their due date automatically change to **Overdue** status. You can filter invoices by status, resend them, or follow up with the client directly.

---

## Referral Program

### How does the referral program work?
Each client gets a unique referral code. When a new customer books using that code, both the referrer and the new customer earn credits. Credits are applied to future bookings.

### What are the default reward amounts?
$25 for the referrer and $25 for the new customer. Both amounts are configurable in **Settings > Referral**.

### Do referral credits expire?
Credits can have expiration dates based on your configuration. Expired credits are tracked in the transaction history.

### What are the referral tiers?
- **Bronze** (1-4 referrals) -- base rewards
- **Silver** (5-9 referrals) -- enhanced rewards
- **Gold** (10+ referrals) -- premium rewards + bonus credits

---

## Marketing Campaigns

### What types of campaigns can I send?
SMS campaigns (via Twilio), email campaigns (via Resend), or both simultaneously.

### How do I target specific clients?
When creating a campaign, use segment filters to target by tags (e.g., "VIP") or by activity (e.g., clients who haven't booked in 90+ days).

### Can I schedule campaigns for later?
Yes. Set a date and time when creating the campaign. It will send automatically.

### How does win-back automation work?
Enable it in Settings and configure a sequence of messages sent at intervals after a client's last booking (e.g., 14 days, 30 days, 60 days). Each step can include a discount offer. The system tracks which step converted the client back.

---

## Data & Security

### Is my data isolated from other companies?
Yes. CleanDayCRM uses multi-tenant architecture with strict data isolation. Every query filters by your company ID. No data is shared between companies.

### Can I back up my data?
Yes. Use the **Backup** feature to export all your data (clients, bookings, invoices, team members). Backups are stored with metadata and can be restored.

### Who can access my company data?
Only users with accounts linked to your company. Cleaners see only their assigned jobs. Customers see only their own bookings. Admins and Owners see everything.

### How are passwords stored?
Passwords are hashed using bcrypt. Plain-text passwords are never stored.

### Is payment data secure?
CleanDayCRM never stores credit card numbers. All payment processing goes through Stripe, which is PCI-DSS compliant. Card data is tokenized by Stripe.js before reaching our servers.

---

## Billing & Plans

### What plans are available?
- **Free** -- basic features
- **Basic** -- additional features
- **Pro** -- all features

Contact support for current pricing details.

### How do I upgrade my plan?
Go to **Settings** to view and change your subscription plan.

---

## Troubleshooting

### SMS messages are not sending
1. Verify your **Twilio credentials** in Settings (Account SID, Auth Token, Phone Number).
2. Check that the phone number format includes the country code (e.g., +15551234567).
3. If using a Twilio trial account, you can only send to verified phone numbers.
4. Check your Twilio console for error logs.

### Stripe payments are not working
1. Verify your **Stripe API keys** in Settings.
2. Check that the **webhook secret** matches what's in your Stripe dashboard.
3. Ensure the webhook endpoint is configured in Stripe (Developers > Webhooks).
4. Check Stripe's dashboard for failed webhook deliveries.

### A cleaner can't see their assigned jobs
1. Confirm the cleaner's account is **active**.
2. Verify the jobs are **assigned to them** specifically (not unassigned).
3. Make sure the jobs are for **today or the upcoming 7 days** (the cleaner portal shows this range).
4. Have the cleaner try logging out and back in.

### Customer can't access the booking page
1. Verify **online booking is enabled** in Settings.
2. Check that your company's URL slug is correct.
3. Make sure the booking page URL is `cleandaycrm.com/your-slug`.

### I forgot my password
Click **Forgot Password** on the login page. Enter your email to receive a reset link.

### The dashboard shows incorrect numbers
Dashboard stats are calculated in real-time based on your company's data. If numbers seem off:
1. Check the date range/filter being used.
2. Verify job statuses are correct (e.g., jobs marked as completed and paid).
3. Refresh the page.

---

## Still Have Questions?

- Email: support@cleandaycrm.com
- Check the [Getting Started guide](./getting-started.md) for setup help
- Check the [Owner/Admin guide](./owner-admin-guide.md) for feature details
- Review the [Tutorials](./tutorials/) for step-by-step walkthroughs
