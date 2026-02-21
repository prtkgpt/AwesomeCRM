# Payment Workflow Requirements

## Overview

This document captures the payment processing workflow requirements for the multi-tenant CRM auto-charge and scheduled payment system.

---

## Payment Trigger Workflow

### 1. Admin Approval Trigger

**Requirement:** Payment processing initiates **after admin approval** of the booking.

```
Booking Flow:
  Customer Books → Admin Reviews → Admin Approves → Payment Workflow Begins
```

- Auto-charge does NOT run on unapproved bookings
- Admin approval is the gate that triggers the payment sequence
- This ensures quality control before any charges occur

---

### 2. Timing: 1-Hour Delay After Approval

**Requirement:** There is a **1-hour delay** between admin approval and payment charge attempt.

```
Timeline:
  [Admin Approves] → [1 hour wait] → [Attempt Charge]
```

**Rationale:**
- Gives customers time to update payment method if needed
- Allows for last-minute cancellations without charging
- Provides a grace period for any booking modifications

---

### 3. Card Preference Settings

**Requirement:** "Card Preferred" and "Card on File" should have **the same behavior**.

| Setting | Behavior |
|---------|----------|
| Card Preferred | Attempt to charge saved card first |
| Card on File | Attempt to charge saved card first |

**Implementation Note:** These are effectively the same option from a charging perspective. Consider consolidating to a single "Auto-charge enabled" setting in the UI to reduce confusion.

---

## Decisions

### 4. First Payment Card Save: Automatic

**Decision:** Card is saved **automatically** when a customer makes their first payment.

- Card-on-file is enabled by default after first successful payment
- No checkbox required from customer
- Maximizes auto-charge adoption rate
- Customer can remove saved card from their account settings if desired

---

## Pre-Authorization & Failed Charge Handling

### 5. Fund Availability Check: 24 Hours Prior

**Requirement:** Check for fund availability **24 hours before** the scheduled service time.

```
Timeline:
  [24 hrs before service] → [Pre-auth check] → [Hold funds or flag issue]
```

**Implementation:**
- Run pre-authorization (not a charge) to verify funds
- If successful: Hold is placed, confirming funds available
- If failed: Trigger the fallback workflow (see below)

---

### 6. Failed Charge Fallback Workflow

**Requirement:** When a charge fails, execute the following fallback sequence:

```
Failed Charge Fallback:
  1. RETRY      → Attempt charge again (with backoff)
  2. NOTIFY     → Alert customer of failed payment
  3. SEND LINK  → Send payment link for manual payment
```

#### Fallback Step Details:

**Step 1: Retry Logic**
| Attempt | Timing | Description |
|---------|--------|-------------|
| 1st | Immediate | Initial charge attempt |
| 2nd | +4 hours | First retry |
| 3rd | +8 hours | Second retry |
| 4th | +24 hours | Final retry |

**Step 2: Notification**
- Send SMS and/or email to customer
- Include: amount due, service date, reason for failure
- Friendly tone with clear call-to-action

**Step 3: Payment Link**
- Generate a Stripe payment link
- Include in notification message
- Link should be valid for 7 days
- Customer can use any payment method

---

## Implementation Status

| Requirement | Status | Notes |
|------------|--------|-------|
| After admin approval trigger | Pending | |
| 1-hour delay | Pending | |
| Card preferred = Card on file | Pending | Consolidate UI options |
| First card save: Automatic | **Decided** | Save card by default |
| 24-hour pre-auth check | Pending | |
| Failed charge: Retry | Pending | Define retry schedule |
| Failed charge: Notify | Pending | Template needed |
| Failed charge: Send payment link | Pending | Stripe integration |

---

## Related Files

- `/home/user/AwesomeCRM/src/app/api/payments/` - Payment API endpoints
- `/home/user/AwesomeCRM/src/app/api/payments/auto-charge/` - Auto-charge implementation
- `/home/user/AwesomeCRM/src/app/api/payments/pre-auth-check/` - Pre-authorization
- `/home/user/AwesomeCRM/prisma/schema.prisma` - Database schema (Booking model has `autoChargeAttemptedAt`, `autoChargeSuccessful` fields)

---

## Next Steps

1. **Implement:** Admin approval → 1hr delay → charge workflow
3. **Implement:** 24-hour pre-authorization check cron job
4. **Implement:** Failed charge retry logic with exponential backoff
5. **Create:** Notification templates for failed charges
6. **Integrate:** Stripe payment link generation for fallback

---

*Last updated: 2026-02-09*
