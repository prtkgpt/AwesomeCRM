# Tutorial: Marketing and Campaigns

This tutorial covers using CleanDayCRM's marketing tools to engage clients, run campaigns, and grow your business.

---

## SMS and Email Campaigns

### Creating a Campaign

1. Go to **Marketing** in the sidebar.
2. Click **New Campaign**.
3. Fill in the campaign details:

| Field | Description |
|-------|------------|
| **Name** | Internal name for the campaign (e.g., "Spring Cleaning Special") |
| **Channel** | SMS, Email, or Both |
| **Subject** | Email subject line (for email campaigns) |
| **Body** | The message content |

### Writing the Message

Use **template variables** to personalize your messages:

| Variable | Replaced With |
|----------|--------------|
| `{{clientName}}` | The client's name |
| `{{businessName}}` | Your company name |

**Example SMS:**
```
Hi {{clientName}}! Spring is here and it's time for a deep clean.
Book this week and get 20% off! Reply YES to schedule.
- {{businessName}}
```

**Example Email:**
```
Subject: Spring Cleaning Special - 20% Off This Week!

Hi {{clientName}},

Spring is the perfect time for a thorough deep clean. We're offering
20% off all deep cleaning services booked this week.

Book now and let us make your home sparkle!

Best,
{{businessName}}
```

### Targeting Your Audience

Use **Segment Filters** to send campaigns to specific groups:

| Filter | Example |
|--------|---------|
| **Tags** | Send to all clients tagged "VIP" |
| **No Booking Days** | Target clients who haven't booked in 90+ days |
| **Custom Selection** | Hand-pick recipients |

### Scheduling

- **Send Now** -- delivers immediately
- **Schedule for Later** -- pick a date and time

### Campaign Stats

After sending, track:
- **Sent Count** -- messages successfully sent
- **Failed Count** -- messages that couldn't be delivered
- **Recipient Status** -- per-recipient delivery status

---

## Message Templates

Customize the automated messages your system sends.

### Template Types

| Template | When It's Sent |
|----------|---------------|
| **Confirmation** | When a booking is created |
| **Reminder** | 24 hours before the appointment (configurable) |
| **On My Way** | When the cleaner taps "On My Way" |
| **Thank You** | After job completion |
| **Payment Request** | When you send a payment link |
| **Review Request** | After payment, asking for a review |
| **Birthday Greeting** | On the client's birthday |
| **Anniversary Greeting** | On the client's anniversary |

### Editing Templates

1. Go to **Settings > Messages** (or the templates section).
2. Select the template to edit.
3. Modify the text using the available variables:

| Variable | Value |
|----------|-------|
| `{{clientName}}` | Client's name |
| `{{date}}` | Job date |
| `{{time}}` | Job time |
| `{{price}}` | Job price |
| `{{address}}` | Full address |
| `{{businessName}}` | Your business name |
| `{{paymentLink}}` | Stripe payment URL |

4. Save.

**Example Confirmation Template:**
```
Hi {{clientName}}! Your cleaning is confirmed for {{date}} at {{time}}
at {{address}}. Total: ${{price}}. See you then! - {{businessName}}
```

**Example Reminder Template:**
```
Hi {{clientName}}, just a reminder that your cleaning is tomorrow
({{date}}) at {{time}}. Please make sure the home is accessible.
See you then! - {{businessName}}
```

---

## Win-Back Automation

Automatically re-engage clients who haven't booked recently.

### Setting Up

1. Go to **Settings**.
2. Enable **Win-Back Automation**.
3. Configure the sequence:

### Default Sequence

| Step | Days Since Last Booking | Channel | Action |
|------|------------------------|---------|--------|
| 1 | 14 days | SMS | Friendly reminder, no discount |
| 2 | 30 days | SMS | Offer a small discount (e.g., 10%) |
| 3 | 60 days | SMS/Email | Offer a larger discount (e.g., 20%) |

### Customizing

For each step, configure:
- **Days** -- how many days after last booking to trigger
- **Channel** -- SMS, Email, or Both
- **Template** -- the message content
- **Discount Percent** -- optional discount offer

### Tracking Results

Each win-back attempt is tracked with a result:
| Result | Meaning |
|--------|---------|
| **Sent** | Message was sent |
| **Delivered** | Message was delivered |
| **Converted** | Client rebooked (tracked automatically) |
| **Expired** | Step expired, moving to next step |
| **Failed** | Message failed to send |

For converted clients, the system tracks:
- Which step converted them
- The booking they made
- Revenue from the rebooking

---

## Referral Program Marketing

Leverage your referral program for growth.

### Setup
1. Go to **Settings > Referral**.
2. Enable the program.
3. Set the **Referrer Reward** (e.g., $25 credit).
4. Set the **Referee Reward** (e.g., $25 credit for the new customer).

### Promoting Referrals
- Each client has a unique referral code.
- Share codes with clients via:
  - Their customer portal profile
  - SMS campaign mentioning the referral program
  - After positive feedback (great time to ask for referrals)

### Tracking
Monitor referral program performance:
- Total active referral codes
- Referrals converted
- Credits earned and redeemed
- Client referral tiers (Bronze, Silver, Gold)

---

## Birthday and Anniversary Greetings

Automatic personalized outreach on special dates.

### Setup
1. Add **birthdays** and **anniversaries** to client profiles.
2. Enable greeting options per client (or use the default enabled setting).
3. The system checks daily and sends greetings automatically.

### Types
- **Birthday Greetings** -- sent on the client's birthday
- **Anniversary Greetings** -- sent on the client's anniversary date
  - First Booking anniversary
  - Wedding anniversary
  - Custom anniversary

### Best Practices
- Include a small offer (e.g., "Enjoy 10% off your next cleaning as a birthday gift!")
- Keep it personal and brief
- Don't overdo it; one message per occasion is enough

---

## Review Requests

Get more online reviews after positive experiences.

### Automatic Review Requests
After a job is completed and payment is received:
1. The system sends a feedback link to the customer.
2. If the customer rates 4 or 5 stars, follow up with a review request.
3. The review request links to your **Google Business** or **Yelp** page.

### Setup
- Add your **Google Review URL** and **Yelp Review URL** in Settings.
- Review requests are sent automatically after positive feedback.

---

## Discount Codes

Create promotional codes for campaigns.

### Creating Codes
1. Go to **Settings > Discount Codes**.
2. Create a new code:
   - **Code**: "SPRING25"
   - **Type**: Percentage (25%) or Fixed ($25 off)
   - **Valid dates**: Set start and end
   - **Max uses**: Limit total redemptions

### Using in Campaigns
Reference discount codes in your campaign messages:
```
Book a deep clean this week and use code SPRING25 for 25% off!
- {{businessName}}
```

---

## Campaign Best Practices

1. **Segment your audience** -- don't send the same message to everyone. VIP clients and lapsed clients need different messaging.
2. **Time it right** -- send campaigns during business hours (10 AM - 2 PM performs well).
3. **Keep SMS short** -- under 160 characters if possible to avoid multi-part messages.
4. **Include a clear call-to-action** -- "Reply YES", "Book now at [link]", "Use code XYZ".
5. **Respect opt-outs** -- clients who opt out of marketing are automatically excluded.
6. **Track results** -- check campaign stats to see what works and iterate.
7. **Don't over-message** -- 1-2 campaigns per month is usually enough. More than that risks annoying clients.

---

## Next Steps

- [Reports and Analytics](./07-reports-and-analytics.md) -- track your marketing ROI
