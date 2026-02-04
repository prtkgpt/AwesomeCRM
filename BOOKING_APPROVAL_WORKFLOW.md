# Booking Approval Workflow Implementation Plan

## Overview
This document outlines the implementation plan for the booking approval workflow with payment pre-authorization when `requireApproval` is enabled.

## Current Implementation Status

### ✅ Completed
1. **Database Schema** - Added to Company model:
   - `onlineBookingEnabled` (Boolean, default: true)
   - `minimumLeadTimeHours` (Int, default: 2)
   - `maxDaysAhead` (Int, default: 60)
   - `requireApproval` (Boolean, default: false)

2. **Settings Page UI** - Admin can configure:
   - Enable/disable online booking
   - Set minimum lead time (hours)
   - Set maximum booking window (days)
   - Toggle manual approval requirement

3. **API Endpoint** - `/api/company/settings` updated to handle new fields

4. **Landing Page** - Generic company landing page at `/{slug}`

## 🔨 Implementation Needed

### 1. Booking Status Enhancement

**Update Booking Model** (if not already present):
```prisma
enum BookingStatus {
  PENDING_APPROVAL    // NEW: Waiting for admin approval
  SCHEDULED           // Approved and scheduled
  CLEANER_COMPLETED   // Cleaner marked complete
  COMPLETED           // Admin approved completion
  CANCELLED
  NO_SHOW
  REJECTED            // NEW: Admin rejected the booking
}
```

### 2. Public Booking Flow with Payment Pre-Authorization

**Endpoint**: `POST /api/public/bookings/{slug}`

#### Workflow:
1. **Customer submits booking** with:
   - Service details (date, time, service type, property info)
   - Contact information
   - Credit card details (via Stripe.js - tokenized)

2. **System validates**:
   - Check `onlineBookingEnabled` is true
   - Verify booking date is within `minimumLeadTimeHours` and `maxDaysAhead`
   - Calculate pricing based on property details

3. **Payment Pre-Authorization**:
   ```javascript
   // Create Stripe PaymentIntent with capture_method: 'manual'
   const paymentIntent = await stripe.paymentIntents.create({
     amount: calculatedAmount,
     currency: 'usd',
     customer: stripeCustomerId,
     payment_method: paymentMethodId,
     capture_method: 'manual', // Pre-auth only, capture later
     confirm: true,
     description: `Cleaning for ${clientName} on ${date}`,
   });
   ```

4. **Create Booking**:
   - If `requireApproval` is FALSE → Status: `SCHEDULED`
   - If `requireApproval` is TRUE → Status: `PENDING_APPROVAL`
   - Store `stripePaymentIntentId` and `paymentPreAuthAmount`

5. **Send Confirmation Email/SMS** to customer:
   - If approved automatically: "Your booking is confirmed"
   - If pending approval: "Your booking is pending approval. You'll hear from us within 24 hours."

### 3. Admin Notification System

**Endpoint**: Send notifications when booking is created with `PENDING_APPROVAL` status

#### Email Notification (via Resend):
```javascript
// To: Company owner/admin email
// Subject: New Booking Requires Your Approval
// Body:
- Customer name and contact
- Service date and time
- Service type and pricing
- Property details
- Link to approve/edit booking: /dashboard/bookings/{bookingId}?action=approve
```

#### SMS Notification (via Twilio):
```javascript
// To: Company owner/admin phone
// Message:
"New booking requires approval!
Customer: {name}
Date: {date} at {time}
Amount: ${amount}
View & approve: {shortUrl}"
```

**Implementation Files**:
- Create `/src/lib/notifications/booking-approval.ts`
- Use existing Twilio/Resend integration from company settings

### 4. Booking Approval Interface

**Page**: `/dashboard/bookings/[bookingId]?action=approve`

#### Features:
1. **Display booking details**:
   - Customer information
   - Service details
   - Property information
   - Calculated pricing
   - Payment status (Pre-authorized: $XXX)

2. **Admin Actions**:
   - ✅ **Approve** → Set status to `SCHEDULED`, send confirmation to customer
   - ✏️ **Edit & Approve**:
     - Change date/time
     - Adjust price
     - Assign cleaner
     - Add internal notes
     - Update in Stripe if price changed
     - Then approve
   - ❌ **Reject** → Set status to `REJECTED`, void pre-authorization, notify customer

3. **Quick Assign**:
   - Dropdown to assign available team member
   - Check availability based on date/time

**API Endpoint**: `PATCH /api/bookings/{bookingId}/approve`
```typescript
interface ApprovalRequest {
  action: 'approve' | 'reject' | 'edit_and_approve';
  scheduledDate?: DateTime;
  price?: number;
  assignedTo?: string; // Team member ID
  internalNotes?: string;
  rejectionReason?: string;
}
```

### 5. Payment Capture Flow

**Current Flow**:
1. Cleaner marks job as "Completed" → Status: `CLEANER_COMPLETED`
2. Admin reviews and approves → Status: `COMPLETED`
3. **Trigger payment capture** when status changes to `COMPLETED`

**Implementation**: Update existing completion workflow

**Endpoint**: `PATCH /api/bookings/{bookingId}/complete`

```javascript
// When admin approves completion
if (booking.stripePaymentIntentId && !booking.isPaid) {
  try {
    // Capture the pre-authorized payment
    const paymentIntent = await stripe.paymentIntents.capture(
      booking.stripePaymentIntentId,
      {
        amount_to_capture: booking.finalPrice || booking.price, // In cents
      }
    );

    // Update booking
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paymentMethod: 'card',
        autoChargeSuccessful: true,
      },
    });

    // Send receipt email to customer
    await sendReceiptEmail(booking);

  } catch (error) {
    // Log error, notify admin
    console.error('Payment capture failed:', error);
  }
}
```

### 6. Customer Notifications

**When booking is approved**:
```javascript
// Email & SMS
"Great news! Your cleaning appointment has been confirmed.

Date: {date}
Time: {time}
Address: {address}
Estimated Price: ${price}

We'll send you a reminder 24 hours before your appointment."
```

**When booking is rejected**:
```javascript
// Email & SMS
"We're sorry, but we're unable to accommodate your cleaning request for {date} at {time}.

{rejectionReason}

Your card was not charged. The pre-authorization hold will be released within 5-7 business days.

Please contact us at {phone} or book a different date: {bookingUrl}"
```

**When payment is captured**:
```javascript
// Email receipt
"Thank you for using {companyName}!

Your payment of ${amount} has been processed.

Service Date: {date}
Service Type: {serviceType}
Card: •••• {last4}

[View Invoice] [Leave a Review]"
```

### 7. Pre-Authorization Expiry Handling

Stripe pre-authorizations expire after **7 days**.

**Implementation**:
- Add cron job or scheduled task to check bookings with:
  - Status: `PENDING_APPROVAL`
  - `paymentPreAuthAt` older than 6 days
- Send urgent notification to admin
- Auto-reject if not approved within 7 days
- Notify customer of rejection and ask to rebook

**Cron Job File**: `/src/app/api/cron/check-pending-approvals/route.ts`

### 8. Public Booking Page UI Enhancements

**Endpoint**: `/{slug}/book`

#### Payment Section:
```typescript
// Add Stripe Elements for card input
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// On form submit:
1. Create PaymentMethod
2. Submit booking with payment_method_id
3. Backend creates PaymentIntent with manual capture
4. Show success message based on requireApproval setting
```

#### Display:
- If `requireApproval` is enabled:
  ```
  "Your card will be pre-authorized but not charged until after your
  cleaning is completed. We'll review your booking request and confirm
  within 24 hours."
  ```
- If `requireApproval` is disabled:
  ```
  "Your card will be charged after your cleaning is completed and
  approved by our team."
  ```

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── bookings/
│   │   │   └── [bookingId]/
│   │   │       ├── approve/
│   │   │       │   └── route.ts           # NEW: Approve/reject booking
│   │   │       └── complete/
│   │   │           └── route.ts           # UPDATE: Add payment capture
│   │   ├── public/
│   │   │   └── bookings/
│   │   │       └── [slug]/
│   │   │           └── route.ts           # UPDATE: Add pre-auth logic
│   │   └── cron/
│   │       └── check-pending-approvals/
│   │           └── route.ts               # NEW: Check expiring pre-auths
│   └── (dashboard)/
│       └── bookings/
│           └── [bookingId]/
│               └── page.tsx               # UPDATE: Add approval UI
└── lib/
    ├── notifications/
    │   ├── booking-approval.ts            # NEW: Approval notifications
    │   └── booking-status.ts              # UPDATE: Add rejection/approval emails
    └── stripe/
        ├── pre-authorize.ts               # NEW: Pre-auth helper
        └── capture-payment.ts             # NEW: Capture helper
```

## Testing Checklist

### With `requireApproval = false`:
- [ ] Customer books → Status immediately `SCHEDULED`
- [ ] Payment pre-authorized
- [ ] Cleaner completes → Status `CLEANER_COMPLETED`
- [ ] Admin approves → Status `COMPLETED`, payment captured
- [ ] Customer receives receipt

### With `requireApproval = true`:
- [ ] Customer books → Status `PENDING_APPROVAL`
- [ ] Payment pre-authorized
- [ ] Admin receives email notification
- [ ] Admin receives SMS notification
- [ ] Admin can approve → Status `SCHEDULED`, customer notified
- [ ] Admin can edit & approve → Updates reflected, customer notified
- [ ] Admin can reject → Status `REJECTED`, pre-auth voided, customer notified
- [ ] Rest of flow same as above

### Edge Cases:
- [ ] Pre-auth expires before approval → Auto-reject
- [ ] Payment capture fails → Admin notified, retry logic
- [ ] Customer cancels before approval → Void pre-auth
- [ ] Price changes during approval → Stripe intent updated

## Security Considerations

1. **PCI Compliance**:
   - Never store raw card details
   - Always use Stripe.js for tokenization
   - Use Stripe Elements for card input

2. **Authorization**:
   - Only OWNER/ADMIN can approve/reject bookings
   - Validate booking belongs to company

3. **Payment Security**:
   - Verify payment_method before creating PaymentIntent
   - Use idempotency keys for payment operations
   - Log all payment operations for audit trail

## Database Migration

When ready, run:
```bash
npx prisma migrate dev --name add_online_booking_settings
```

This will add the new fields to the Company table:
- `onlineBookingEnabled`
- `minimumLeadTimeHours`
- `maxDaysAhead`
- `requireApproval`

## Next Steps

1. Run database migration (when database is accessible)
2. Update BookingStatus enum to include `PENDING_APPROVAL` and `REJECTED`
3. Implement booking approval API endpoint
4. Build approval notification system
5. Create approval UI in dashboard
6. Implement payment pre-authorization in public booking flow
7. Add payment capture logic to completion workflow
8. Create cron job for pre-auth expiry checking
9. Update public booking page with Stripe Elements
10. Test entire workflow end-to-end

## Estimated Development Time

- Database updates: 30 minutes
- API endpoints: 4 hours
- Notification system: 3 hours
- Admin approval UI: 4 hours
- Public booking page updates: 3 hours
- Payment pre-auth/capture: 4 hours
- Testing & refinement: 4 hours

**Total**: ~22-24 hours of development
