# Tutorial: Scheduling Jobs

This tutorial covers creating, managing, and completing cleaning jobs in CleanDayCRM.

---

## Creating a One-Time Job

1. Go to **Calendar** or **Jobs** in the sidebar.
2. Click **New Job**.
3. Fill in the details:

| Field | Description |
|-------|------------|
| **Client** | Select from your client list (or create new) |
| **Address** | Choose one of the client's saved addresses |
| **Date** | The date of the cleaning |
| **Time** | Start time |
| **Duration** | How long the job should take (in minutes) |
| **Service Type** | Standard, Deep Clean, or Move-Out |
| **Price** | The amount to charge |
| **Assign To** | (Optional) Assign a specific cleaner |
| **Notes** | (Optional) Customer-facing notes |
| **Internal Notes** | (Optional) Private notes for your team |

4. Click **Create Job**.

The job appears on your calendar and (if assigned) on the cleaner's dashboard.

---

## Creating Recurring Jobs

For clients who want regular cleanings:

1. When creating a job, toggle **Recurring** on.
2. Select the **Frequency**:
   - **Weekly** -- every 7 days
   - **Biweekly** -- every 14 days
   - **Monthly** -- same date each month
3. (Optional) Set an **End Date**. Leave blank for ongoing.
4. Click **Create Job**.

The system creates the first job and automatically generates future instances based on the frequency. You can manage the recurring series from the **Subscriptions** page.

### Managing Recurring Series
- **Pause** -- temporarily stop generating new instances (e.g., client on vacation)
- **Resume** -- restart the series
- **Modify** -- change the frequency or end date
- **Cancel** -- stop the series entirely

---

## Assigning Jobs to Cleaners

### During Creation
Select a cleaner from the **Assign To** dropdown when creating the job.

### After Creation
1. Open the job.
2. Click the **Assign** dropdown.
3. Select a team member.
4. Save.

The cleaner sees the job appear on their Cleaner Dashboard immediately.

### Tips for Assignment
- Check the cleaner's **availability** (set in their team profile)
- Consider their **service areas** (zip codes they cover)
- Match their **specialties** (e.g., assign deep cleans to cleaners experienced in deep cleaning)
- Check the calendar for scheduling **conflicts**

---

## The Job Lifecycle

A job moves through these statuses:

```
SCHEDULED
    |
    v
CLEANER COMPLETED  (cleaner marks done)
    |
    v
COMPLETED  (admin approves)
    |
    v
PAID  (payment collected)
```

### Stage 1: Scheduled
The job is booked and appears on the calendar. Automated reminders are sent based on your reminder settings.

### Stage 2: Cleaner Completed
The cleaner taps **Complete Job** on their portal. This means:
- They finished the cleaning
- Their clock-in/clock-out times are recorded
- The checklist (if any) is done

The job now awaits admin review.

### Stage 3: Admin Approval
You review the completed job:
- Check the cleaner's observations/notes
- Verify the checklist completion
- Confirm everything looks good
- Click **Approve**

The job status changes to **Completed** and payment can be processed.

### Stage 4: Payment
See [Payments and Invoices](./04-payments-and-invoices.md) for details on collecting payment.

---

## Sending Notifications

### Confirmation
When a job is created, you can send an immediate confirmation SMS:
- Click **Send Confirmation** on the job detail page.
- The customer receives: "Your cleaning is confirmed for [date] at [time]."

### Reminder
Reminders are sent automatically based on your settings (e.g., 24 hours before). You can also send manual reminders:
- Click **Send Reminder** on the job.

### On My Way
When the cleaner taps **On My Way**, the customer can be notified automatically.

---

## Job Notes

### Customer-Facing Notes
These appear on the booking confirmation and are visible to the customer:
- "Deep clean of kitchen and bathrooms. Please clear counters beforehand."

### Internal Notes
These are visible only to your team (admins and the assigned cleaner):
- "Client is particular about streaks on mirrors. Use newspaper technique."

### Cleaning Observations
After completing the job, the cleaner can add observations:
- "Stain on living room carpet near the couch, could not remove."
- "Front door deadbolt is stiff, had trouble locking up."

---

## Insurance Documentation

For insured clients, add documentation to the booking:

1. Open the job.
2. Fill in the **Insurance Documentation** field with service details required by the insurance provider.
3. Add **Cleaning Observations** for the insurance record.
4. Insurance and copay amounts are tracked separately on the booking.

---

## Cancelling a Job

1. Open the job.
2. Click **Cancel**.
3. The status changes to **Cancelled**.
4. If a payment was pre-authorized, it is voided.

---

## Handling No-Shows

If the customer or cleaner does not show up:
1. Open the job.
2. Change the status to **No Show**.
3. Handle any payment or rescheduling as needed.

---

## Calendar Tips

- Use the **Day View** to see all jobs for a specific date
- Navigate between days using the arrow buttons
- Jobs are color-coded by status for quick visual scanning
- Click any job on the calendar to open its details

---

## Next Steps

- [Payments and Invoices](./04-payments-and-invoices.md) -- collect payments for completed jobs
- [Team Management](./05-team-management.md) -- manage your cleaning staff
