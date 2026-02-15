# Tutorial: Managing Clients

This tutorial covers how to add, organize, and manage your client base in CleanDayCRM.

---

## Adding a New Client

1. Go to **Clients** in the sidebar.
2. Click **New Client**.
3. Fill in the client details:

### Required
- **Name** -- the client's full name

### Recommended
- **Email** -- for invoices and email notifications
- **Phone** -- for SMS reminders and payment links
- **Tags** -- labels for organizing (see below)

### Optional
- **Notes** -- general notes about the client (visible to your team)
- **Insurance Info** -- if the client has insurance coverage for cleaning

4. Click **Save** (or continue to add an address).

---

## Adding Addresses

Each client needs at least one address for booking jobs.

1. On the client detail page, click **Add Address**.
2. Fill in:
   - **Label** -- "Home", "Office", "Vacation Home", etc.
   - **Street, City, State, Zip**
3. Optionally add **Property Details**:
   - Property type (Single Family, Condo, Apartment, Townhouse)
   - Square footage
   - Bedrooms, Bathrooms, Floors
   - Year built
4. Add **Cleaner Notes** (visible to assigned cleaners):
   - **Parking Info** -- "Park in driveway, not on street"
   - **Gate Code** -- "Gate code is 1234#"
   - **Pet Info** -- "2 dogs, friendly but bark a lot"
   - **Preferences** -- "Remove shoes, use back door"
5. Click **Save Address**.

> You can add multiple addresses per client. When booking a job, you select which address.

---

## Using Tags

Tags help you filter and organize clients. Some useful tag conventions:

| Tag | Meaning |
|-----|---------|
| VIP | High-value, priority client |
| Weekly | Has a weekly recurring schedule |
| Biweekly | Has a biweekly recurring schedule |
| Monthly | Has a monthly recurring schedule |
| Insurance | Covered by insurance |
| Cash | Prefers to pay cash |
| New | Recently added client |
| Inactive | Not currently booking |

### Filtering by Tags
On the Clients page, use the search or filter options to find clients by tag. This is useful for:
- Finding all VIP clients
- Identifying inactive clients for win-back campaigns
- Filtering insurance clients for billing

---

## Setting Up Client Preferences

For personalized service, add detailed preferences to the client profile.

1. Open the client's detail page.
2. Go to the **Preferences** section.
3. Fill in as many fields as relevant:

### Cleaning
- **Cleaning Sequence** -- "Start with master bedroom, then kitchen"
- **Focus Areas** -- "Extra scrub on kitchen floor and bathroom tiles"
- **Areas to Avoid** -- "Don't touch papers on home office desk"

### Products
- **Allergies** -- "Allergic to bleach-based products"
- **Preferred Products** -- "Uses Mrs. Meyer's, supplies are under kitchen sink"
- **Scent Preferences** -- "Lavender is fine, no lemon or citrus scents"

### Pets
- **Pet Handling** -- "Golden retriever named Max, keep in backyard during cleaning"
- **Pet Feeding** -- "Feed cat at noon if cleaning takes over 2 hours"

### Entry
- **Key Location** -- "Spare key under the gray flower pot by the back door"
- **Alarm Code** -- "4567, disarm within 30 seconds of opening door"
- **Entry Instructions** -- "Use side gate to backyard, then back door. Front door lock is broken."

### Communication
- **Contact Method** -- SMS, Email, or Phone
- **Language** -- if the client prefers a specific language

### Special
- **Special Requests** -- "Please water the orchid in the living room"
- **Things to Know** -- "Upstairs toilet runs if you jiggle the handle"
- **Temperature** -- "Keep AC at 72 degrees"

---

## Insurance Clients

For clients covered by insurance (e.g., Helper Bee's):

1. Open the client profile.
2. Toggle **Has Insurance** on.
3. Fill in:
   - **Insurance Provider** -- "Helper Bee's", "Blue Cross", etc.
   - **Referral ID** -- the insurance referral or member ID
   - **Insurance Payment Amount** -- what the insurance covers per visit (e.g., $125)
   - **Standard Copay Amount** -- what the client pays (e.g., $50)
   - **Copay Discount** -- any discount on the copay (e.g., $10 off)
   - **Copay Notes** -- special arrangements

When creating bookings for insurance clients, the insurance and copay amounts are tracked separately on the job.

---

## Referral Codes

Each client can have a unique referral code.

1. Open the client profile.
2. The **Referral Code** is auto-generated (e.g., "JOHN-ABC123").
3. Share this code with the client.
4. When someone books using their code, both parties earn credit.
5. Track referral stats on the client profile: total referrals, credits earned/used, current tier.

---

## Birthday and Anniversary Tracking

Add personal dates for automated greetings:

1. Open the client profile.
2. Add their **Birthday** and/or **Anniversary**.
3. For anniversary, select the type: First Booking, Wedding, or Custom.
4. Enable or disable **Birthday Greetings** and **Anniversary Greetings**.

The system automatically sends personalized messages on these dates (requires SMS or email integration).

---

## Editing and Deleting Clients

### Editing
1. Open the client from the Clients list.
2. Click **Edit** or directly modify fields.
3. Save your changes.

### Deleting
1. Open the client profile.
2. Click **Delete Client**.
3. Confirm the deletion.

> Deleting a client removes all their addresses, bookings, and invoices. This cannot be undone. Consider tagging them as "Inactive" instead if you might need the data later.

---

## Marketing Opt-Out

If a client asks not to receive marketing messages:
1. Open their profile.
2. Toggle **Marketing Opt-Out** on.
3. They will be excluded from all campaigns and promotional messages.

Note: Operational messages (booking confirmations, reminders, payment links) are still sent regardless of opt-out status.

---

## Next Steps

- [Scheduling Jobs](./03-scheduling-jobs.md) -- book jobs for your clients
- [Payments and Invoices](./04-payments-and-invoices.md) -- collect payments
