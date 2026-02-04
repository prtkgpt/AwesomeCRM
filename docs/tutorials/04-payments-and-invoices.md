# Tutorial: Payments and Invoices

This tutorial covers collecting payments and managing invoices in CleanDayCRM.

---

## Payment Methods

CleanDayCRM supports multiple payment methods:

| Method | Setup Required | How It Works |
|--------|---------------|-------------|
| **Credit Card (Stripe)** | Stripe API keys in Settings | Send a payment link; customer pays online |
| **Zelle** | Add Zelle email in Settings | Customer transfers directly |
| **Venmo** | Add Venmo username in Settings | Customer sends via Venmo |
| **CashApp** | Add CashApp username in Settings | Customer sends via CashApp |
| **Cash** | None | Collect in person, mark as paid |
| **Check** | None | Collect in person, mark as paid |

---

## Collecting Payment via Stripe

Stripe is the recommended method for card payments. It handles everything securely.

### Sending a Payment Link

1. Open a **Completed** job.
2. Click **Request Payment** (or **Send Payment Link**).
3. The system:
   - Creates a Stripe payment link for the job amount.
   - Sends an SMS to the customer with the link.
4. The customer taps the link, pays with their card.
5. Stripe confirms the payment via webhook.
6. The job is automatically marked as **Paid**.

### Auto-Charge

For clients with a saved payment method:
1. Open the client profile.
2. Enable **Auto-Charge**.
3. After a job is completed and approved, the system automatically charges the saved card.
4. The customer receives a receipt.

This is ideal for recurring clients who prefer not to pay each time manually.

---

## Collecting Manual Payments

For cash, check, Zelle, Venmo, or CashApp:

1. Open the completed job.
2. Click **Mark as Paid**.
3. Select the **Payment Method** from the dropdown.
4. The job is immediately marked as paid.

---

## Insurance and Copay Payments

For insurance clients, payments are split:

### Insurance Payment
- The insurance company pays the **insurance amount** (e.g., $125).
- Mark the insurance portion as paid when you receive the insurance payment.

### Copay Payment
- The client pays the **copay amount** (e.g., $50).
- The copay can be paid via any method: Stripe, Zelle, Venmo, CashApp, or cash.
- If a copay discount applies, the **final copay amount** reflects the discount.

### Tracking
Each booking shows:
- Insurance amount and whether it's paid
- Copay amount (after any discounts) and whether it's paid
- Payment method for the copay

---

## Referral Credits

If a customer has referral credits:
- Credits are applied to the booking when created.
- The **Referral Credits Applied** field shows how much credit was used.
- The **Final Price** reflects the price after credits.
- Any remaining balance is collected via the normal payment methods.

---

## Creating Invoices

For formal billing:

1. Go to **Invoices** in the sidebar.
2. Click **New Invoice**.
3. Fill in:
   - **Client** -- select the client
   - **Booking** (optional) -- link to a specific job
   - **Due Date** -- when payment is expected
   - **Line Items** -- add each service/charge:
     - Description (e.g., "Standard Cleaning - 3BR/2BA")
     - Quantity (e.g., 1)
     - Rate (e.g., $150.00)
   - **Tax** -- add tax percentage if applicable
   - **Notes** -- any additional information
   - **Payment Terms** -- e.g., "Due upon receipt" or "Net 30"
4. Save as **Draft** or click **Send**.

### Invoice Number
Each invoice gets a unique auto-generated invoice number for your records.

---

## Sending Invoices

1. Open a **Draft** invoice.
2. Click **Send**.
3. Enter the recipient's email (auto-filled from client profile).
4. The invoice is emailed to the client.
5. Status changes to **Sent**.

---

## Invoice Statuses

| Status | Meaning |
|--------|---------|
| **Draft** | Created but not yet sent |
| **Sent** | Emailed to the client |
| **Paid** | Payment has been received |
| **Overdue** | Past the due date, unpaid |
| **Cancelled** | Invoice was voided |

---

## Managing Overdue Invoices

When an invoice passes its due date:
1. The status automatically changes to **Overdue**.
2. Go to **Invoices** and filter by **Overdue**.
3. You can:
   - Resend the invoice
   - Contact the client directly
   - Send a payment link
   - Mark as paid if payment was received offline

---

## Discount Codes

Offer promotional pricing:

### Creating a Discount Code
1. Go to **Settings > Discount Codes**.
2. Click **New Code**.
3. Fill in:
   - **Code** -- e.g., "SPRING25" or "COMEBACK20"
   - **Discount Type** -- Percentage or Fixed Amount
   - **Discount Value** -- e.g., 25 (for 25%) or 50 (for $50 off)
   - **Valid From / Valid Until** -- the date range
   - **Max Uses** -- leave blank for unlimited
4. Save.

### How Customers Use Codes
Customers enter the code when booking online. The discount is applied to the booking price.

### Tracking
Each discount code shows:
- Total times used
- Remaining uses (if limited)
- Active/inactive status

---

## Tips for Getting Paid Faster

1. **Send payment links immediately** after approving a completed job.
2. **Enable auto-charge** for recurring clients to eliminate payment friction.
3. **Set clear payment terms** on invoices (e.g., "Due upon receipt").
4. **Send reminders** for overdue invoices.
5. **Offer multiple payment methods** so customers can pay however is most convenient.

---

## Cleaner Pay

Track payments to your cleaners:

1. Go to **Team** and select a team member.
2. Add **Pay Logs** for:
   - **Paychecks** -- based on hours worked and hourly rate
   - **Supplies Reimbursement** -- with receipt URL
   - **Gas Reimbursement** -- based on your reimbursement rate
3. Each pay log records: amount, date, description, and pay period (for paychecks).

---

## Next Steps

- [Team Management](./05-team-management.md) -- manage your cleaning staff
- [Marketing and Campaigns](./06-marketing-and-campaigns.md) -- reach your clients
