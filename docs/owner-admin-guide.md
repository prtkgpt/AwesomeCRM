# Owner & Admin Guide

This guide covers every feature available to **Owner** and **Admin** users in CleanDayCRM. Owners have full access; Admins have the same access except they cannot delete the company or transfer ownership.

---

## Table of Contents

1. [Dashboard](#dashboard)
2. [Calendar](#calendar)
3. [Jobs (Bookings)](#jobs-bookings)
4. [Clients](#clients)
5. [Team Management](#team-management)
6. [Invoices](#invoices)
7. [Estimates](#estimates)
8. [Marketing & Campaigns](#marketing--campaigns)
9. [Reports & Analytics](#reports--analytics)
10. [Referral Program](#referral-program)
11. [Subscriptions (Recurring Jobs)](#subscriptions-recurring-jobs)
12. [Settings](#settings)

---

## Dashboard

The dashboard is your home screen. It displays:

- **Today's Jobs** -- number of jobs scheduled for today
- **Revenue This Month** -- total revenue for the current month
- **Outstanding Payments** -- unpaid jobs that need follow-up
- **Upcoming Jobs** -- a quick view of the next few scheduled jobs
- **Recent Activity Feed** -- latest bookings, payments, and messages

Use the dashboard to get a high-level view of your business at a glance.

---

## Calendar

The calendar provides a visual view of all scheduled jobs.

### Features
- **Day View** -- see all jobs for a single day, organized by time
- Navigate between days using the forward/back arrows
- Click on any job to view its details
- Jobs are color-coded by status (Scheduled, Completed, Cancelled)

### Creating Jobs from Calendar
Click on any time slot or use the **New Job** button to create a booking directly from the calendar view.

---

## Jobs (Bookings)

Jobs are the core of CleanDayCRM. Each job represents a cleaning appointment.

### Job Statuses
| Status | Meaning |
|--------|---------|
| **Scheduled** | Job is booked and upcoming |
| **Cleaner Completed** | The cleaner marked the job as done, pending admin review |
| **Completed** | Admin has approved the job, ready for payment |
| **Cancelled** | Job was cancelled |
| **No Show** | Customer or cleaner did not show up |

### Two-Stage Completion Workflow
1. **Cleaner marks complete** -- the cleaner clicks "Complete Job" from their portal. Status changes to **Cleaner Completed**.
2. **Admin approves** -- you review the job and approve it. Status changes to **Completed**. Payment can then be processed.

This two-stage process gives you quality control before charging the customer.

### Creating a Job
1. Select a **Client** and their **Address**.
2. Choose **Date/Time** and **Duration**.
3. Select **Service Type** (Standard, Deep Clean, Move-Out).
4. Set the **Price**.
5. Optionally **assign a cleaner** from your team.
6. Add **notes** (customer-facing) or **internal notes** (private).

### Recurring Jobs
Toggle **Recurring** when creating a job to set up repeating appointments:
- **Weekly** -- every 7 days
- **Biweekly** -- every 14 days
- **Monthly** -- same date each month

Set an optional end date, or leave blank for ongoing.

### Job Actions
- **Send Confirmation** -- SMS confirmation to the customer
- **Send Reminder** -- manual reminder SMS
- **Request Payment** -- send a Stripe payment link via SMS
- **Mark as Paid** -- record a cash/check/Zelle payment
- **Send Feedback Link** -- request a rating and tip from the customer
- **Send Review Request** -- ask the customer for a Google/Yelp review

### Insurance Tracking
For clients with insurance coverage (e.g., Helper Bee's):
- Track **insurance amount** and **copay amount** separately
- Apply **copay discounts**
- Mark insurance and copay payments independently
- Add **insurance documentation** and **cleaning observations**

---

## Clients

Clients are your customers. Each client can have multiple addresses and detailed preferences.

### Client Fields
- **Name**, **Email**, **Phone**
- **Tags** -- categorize clients (VIP, Weekly, Monthly, Insurance, etc.)
- **Notes** -- general notes visible to your team
- **Insurance Info** -- provider, referral ID, payment amounts, copay details

### Addresses
Each client can have multiple addresses with:
- Full address (street, city, state, zip)
- **Google Maps verification** for accurate location
- **Property details**: type, square footage, bedrooms, bathrooms, floors
- **Cleaner notes**: parking info, gate code, pet info, entry preferences

### Client Preferences
Detailed preferences for personalized service:
- **Cleaning sequence** -- which rooms to start with
- **Focus areas** -- areas that need extra attention
- **Areas to avoid** -- things not to touch or move
- **Product allergies** -- bleach, scents, etc.
- **Pet handling instructions** -- what to do with pets during cleaning
- **Entry instructions** -- key location, alarm code, how to enter
- **Communication preferences** -- preferred contact method, language
- **Special requests** -- watering plants, temperature settings, etc.

### Referral Tracking
Each client gets a unique **referral code**. Track:
- How many people they referred
- Credits earned and used
- Referral tier (None, Bronze, Silver, Gold)

### Stripe Integration
- Link clients to a **Stripe customer ID** for easy payments
- Save a **payment method** for auto-charging
- Enable **auto-charge** after job completion

---

## Team Management

Manage your cleaning staff and office team.

### Roles
| Role | Access |
|------|--------|
| **Owner** | Full access, company settings, billing |
| **Admin** | Full operational access, team management |
| **Cleaner** | View assigned jobs, mark complete, performance stats |
| **Customer** | View bookings, pay invoices, manage preferences |

### Inviting Team Members
1. Go to **Team** in the sidebar.
2. Click **Invite Team Member**.
3. Enter their email and select their role (Admin or Cleaner).
4. They receive an email with a signup link that expires in 7 days.
5. When they accept, their account is created with the correct role.

### Team Member Profiles
For each cleaner, you can track:
- **Employment info** -- hourly rate, employee ID, hire date
- **Personal info** -- emergency contact, photo
- **Address** -- street, city, state, zip
- **Work info** -- specialties, availability, experience, speed rating
- **Service areas** -- zip codes or cities they cover

### Assigning Jobs
When creating or editing a job, use the **Assign To** dropdown to assign a specific cleaner. The cleaner sees the job in their portal.

### Activate/Deactivate
Toggle a team member's active status without deleting their account. Deactivated members cannot log in.

---

## Invoices

Create and send professional invoices to clients.

### Invoice Statuses
| Status | Meaning |
|--------|---------|
| **Draft** | Created but not sent |
| **Sent** | Emailed to the client |
| **Paid** | Payment received |
| **Overdue** | Past the due date |
| **Cancelled** | Voided |

### Creating an Invoice
1. Go to **Invoices** and click **New Invoice**.
2. Select a **Client**.
3. Optionally link to a **Booking**.
4. Add **line items** (description, quantity, rate).
5. Set **due date**, **tax**, and **notes/terms**.
6. Save as **Draft** or **Send** immediately.

### Invoice Features
- Auto-generated **invoice numbers**
- **Line items** with quantity and rate
- **Tax calculation**
- **Email delivery** with tracking
- **Payment terms** customization

---

## Estimates

Send price estimates to potential customers before booking.

### How Estimates Work
1. Create a booking with estimated pricing.
2. Generate an **estimate link** (unique, shareable URL).
3. Send the link to the customer.
4. The customer views the estimate on a branded page.
5. If they accept, the booking is confirmed.

The estimate page shows:
- Your company branding (logo, colors)
- Service details and pricing
- Property information
- An **Accept** button for the customer

---

## Marketing & Campaigns

Run SMS and email campaigns to your client base.

### Campaign Types
- **SMS** -- text message campaigns via Twilio
- **Email** -- email campaigns via Resend
- **Both** -- send via both channels

### Creating a Campaign
1. Go to **Marketing** in the sidebar.
2. Click **New Campaign**.
3. Name your campaign.
4. Choose the **channel** (SMS, Email, or Both).
5. Write the **message body** (use variables like `{{clientName}}`).
6. Set **audience filters** -- target by tags, last booking date, etc.
7. **Schedule** for later or **Send** immediately.

### Campaign Variables
Use these in your message templates:
- `{{clientName}}` -- client's name
- `{{businessName}}` -- your company name

### Win-Back Automation
Automatically re-engage lapsed customers:
1. Go to **Settings** and enable **Win-Back Automation**.
2. Configure the sequence steps:
   - **Step 1** -- e.g., 14 days after last booking, send a friendly reminder
   - **Step 2** -- e.g., 30 days, offer a small discount
   - **Step 3** -- e.g., 60 days, offer a larger discount
3. Track results: Sent, Delivered, Converted, Expired

### Birthday & Anniversary Greetings
- Add client **birthdays** and **anniversaries** in their profile.
- Enable automatic greetings in client settings.
- The system sends personalized messages on their special days.

---

## Reports & Analytics

Track your business performance.

### Available Reports
- **Revenue** -- total revenue by period (week, month, quarter, year)
- **Jobs Completed** -- number of completed jobs
- **Outstanding Payments** -- unpaid amounts
- **Cleaner Performance** -- jobs per cleaner, ratings, speed
- **Customer Metrics** -- top customers by revenue, booking frequency

### Financial Dashboard (Owner Only)
Advanced analytics for business owners:
- Revenue trends and forecasting
- Profit margin analysis by service type
- Customer lifetime value
- New vs. recurring customer revenue
- Payment method breakdown
- Top revenue customers

### Operational Expenses
Track monthly business costs in **Settings > Operations**:
- Insurance, bond, workers comp
- Cleaning supplies
- Gas reimbursement
- VA/admin salary
- Owner salary

---

## Referral Program

Grow your business through customer referrals.

### Setup
1. Go to **Settings > Referral**.
2. Enable the referral program.
3. Set reward amounts:
   - **Referrer reward** -- credit for the person who refers (default: $25)
   - **Referee reward** -- credit for the new customer (default: $25)

### How It Works
- Each client gets a unique referral code (e.g., "JOHN-ABC123").
- When a new customer signs up with that code, both parties earn credit.
- Credits are tracked with full transaction history.
- Credits expire if not used within the configured timeframe.

### Referral Tiers
| Tier | Referrals | Benefit |
|------|-----------|---------|
| None | 0 | -- |
| Bronze | 1-4 | Base rewards |
| Silver | 5-9 | Enhanced rewards |
| Gold | 10+ | Premium rewards + bonus credits |

---

## Subscriptions (Recurring Jobs)

Manage recurring cleaning schedules.

### Features
- View all active recurring job series
- **Pause** a recurring series (e.g., customer on vacation)
- **Resume** a paused series
- See upcoming generated instances
- Modify frequency or end date

---

## Settings

### Company Profile
- Business name, contact info, logo, branding colors
- Timezone and currency

### Pricing
- Base hourly rate
- Service type multipliers
- Pricing rules (bedroom/bathroom/add-on pricing)

### Online Booking
- Enable/disable public booking page
- Lead time and booking window
- Manual approval toggle

### Reminders
- Customer reminder timing
- Cleaner reminder timing
- Morning-of reminder configuration

### Integrations
- **Stripe** keys for payment processing
- **Twilio** credentials for SMS
- **Resend** API key for email

### Operations
- Monthly expense tracking (insurance, supplies, gas, salaries)

### Referral Program
- Enable/disable and configure reward amounts

### Win-Back Automation
- Enable/disable and configure sequence steps

### Discount Codes
- Create promotional codes (percentage or fixed amount)
- Set validity periods and usage limits
- Track redemptions

---

## Data Backup

Protect your business data.

### Creating a Backup
1. Go to **Settings** or the admin panel.
2. Click **Create Backup**.
3. The system exports all your data: clients, bookings, invoices, team members.
4. Backups are stored with metadata (client count, booking count, size).

### Restoring a Backup
Select a previous backup and restore your data to that point in time.

---

## Keyboard Shortcuts & Tips

- Use the **sidebar** to navigate between sections
- The **search bar** in Clients lets you find clients quickly by name, email, or phone
- **Tags** on clients are powerful filters -- use them consistently
- The **dark mode** toggle is in the sidebar footer
- All dates and times respect your configured **timezone**
