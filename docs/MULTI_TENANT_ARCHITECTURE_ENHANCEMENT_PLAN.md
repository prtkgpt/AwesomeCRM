# Multi-Tenant Architecture Enhancement Plan

## Overview

This document outlines the phased implementation plan for enhancing the multi-tenant architecture of AwesomeCRM. The implementation follows the recommended order: **Analytics → Email → Cleaner → Customer → PWA**.

---

## Current State Summary

### ✅ Already Implemented
- Multi-tenant database architecture with `companyId` on all models
- Role-based authentication (OWNER, ADMIN, CLEANER, CUSTOMER)
- Company signup flow with unique slugs
- Team management and invitation system
- Basic cleaner portal
- Route middleware for access control
- Basic analytics endpoints

### 🎯 Enhancement Goals
1. **Analytics**: Comprehensive tenant-specific dashboards and reporting
2. **Email**: Advanced email templates, campaigns, and automation per tenant
3. **Cleaner**: Enhanced mobile experience with real-time features
4. **Customer**: Full self-service portal with booking and payments
5. **PWA**: Offline-capable progressive web app for mobile users

---

## Phase 1: Analytics Service Enhancement

### Objectives
- Create comprehensive analytics dashboards per tenant
- Implement real-time metrics tracking
- Add comparative analytics and trends
- Enable data export capabilities

### Components to Build

#### 1.1 Analytics Dashboard API (`/api/analytics/*`)
```
/api/analytics/overview          - Company-wide KPIs
/api/analytics/revenue           - Revenue breakdown and trends
/api/analytics/bookings          - Booking analytics and patterns
/api/analytics/team-performance  - Individual and team metrics
/api/analytics/customer-insights - Customer behavior analytics
/api/analytics/export            - CSV/PDF export endpoint
```

#### 1.2 Key Metrics to Track

**Financial Metrics**
- Total revenue (daily/weekly/monthly/yearly)
- Revenue by service type
- Revenue per cleaner
- Average booking value
- Outstanding payments
- Referral revenue impact

**Operational Metrics**
- Bookings completed vs. scheduled
- Cancellation rate
- No-show rate
- Average job duration vs. estimated
- Cleaner utilization rate
- Peak booking times/days

**Customer Metrics**
- New vs. returning customers
- Customer lifetime value (CLV)
- Churn rate
- Referral conversion rate
- Net Promoter Score (NPS)
- Customer satisfaction ratings

**Team Metrics**
- Jobs per cleaner (daily/weekly)
- On-time arrival rate
- Customer ratings per cleaner
- Revenue generated per cleaner
- Tip earnings per cleaner

#### 1.3 Dashboard Components

**Admin Analytics Page** (`/admin/analytics`)
- KPI cards with sparkline trends
- Revenue chart (line/bar)
- Booking heatmap (day/hour)
- Top performers leaderboard
- Customer acquisition funnel
- Date range selector
- Export buttons

#### 1.4 Database Additions

```prisma
model AnalyticsSnapshot {
  id           String   @id @default(cuid())
  companyId    String
  company      Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  date         DateTime @db.Date
  type         String   // DAILY, WEEKLY, MONTHLY

  // Revenue metrics
  totalRevenue        Float
  averageBookingValue Float
  revenueByService    Json    // { "STANDARD": 1000, "DEEP": 500 }

  // Booking metrics
  totalBookings       Int
  completedBookings   Int
  cancelledBookings   Int
  noShowBookings      Int

  // Customer metrics
  newCustomers        Int
  returningCustomers  Int
  totalActiveCustomers Int

  // Team metrics
  activeCleaners      Int
  averageJobsPerCleaner Float

  createdAt    DateTime @default(now())

  @@unique([companyId, date, type])
  @@index([companyId, date])
}
```

### Deliverables
- [ ] Analytics API endpoints (6 routes)
- [ ] AnalyticsSnapshot model for historical data
- [ ] Admin analytics dashboard page
- [ ] Data export functionality (CSV)
- [ ] Cron job for daily/weekly/monthly snapshots
- [ ] Real-time dashboard updates

---

## Phase 2: Email Service Enhancement

### Objectives
- Tenant-specific email templates with branding
- Campaign management system
- Automated email sequences
- Email analytics and tracking

### Components to Build

#### 2.1 Email Template System

**Template Categories**
- Transactional (booking confirmations, invoices)
- Marketing (promotions, newsletters)
- Automated (reminders, follow-ups)
- Referral (invite emails, rewards)

**Template Features**
- Company branding (logo, colors)
- Variable substitution
- Preview functionality
- A/B testing support
- Mobile-responsive design

#### 2.2 Campaign Management

```
/api/email/campaigns              - CRUD for campaigns
/api/email/campaigns/[id]/send    - Send campaign
/api/email/campaigns/[id]/stats   - Campaign analytics
/api/email/templates              - Template management
/api/email/templates/[id]/preview - Template preview
/api/email/analytics              - Email analytics dashboard
```

#### 2.3 Automated Email Sequences

**Trigger-based Emails**
- Welcome email on signup
- Booking confirmation
- 24-hour reminder
- Post-service thank you
- Review request (3 days after)
- Win-back email (30/60/90 days inactive)
- Birthday/Anniversary greetings
- Referral reward notifications

**Drip Campaigns**
- New customer onboarding series
- Service upsell sequences
- Re-engagement campaigns

#### 2.4 Email Analytics

**Metrics to Track**
- Delivery rate
- Open rate
- Click rate
- Unsubscribe rate
- Bounce rate
- Conversion rate

#### 2.5 Database Additions

```prisma
model EmailTemplate {
  id           String   @id @default(cuid())
  companyId    String
  company      Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  name         String
  category     String   // TRANSACTIONAL, MARKETING, AUTOMATED
  subject      String
  htmlContent  String   @db.Text
  textContent  String?  @db.Text
  variables    Json     // Available variables for this template

  isDefault    Boolean  @default(false)
  isActive     Boolean  @default(true)

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([companyId, category])
}

model EmailLog {
  id           String   @id @default(cuid())
  companyId    String
  company      Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  templateId   String?
  campaignId   String?
  recipientId  String?  // Client or User ID
  recipientEmail String

  subject      String
  status       String   // QUEUED, SENT, DELIVERED, OPENED, CLICKED, BOUNCED, FAILED

  sentAt       DateTime?
  openedAt     DateTime?
  clickedAt    DateTime?

  metadata     Json?    // Additional tracking data

  createdAt    DateTime @default(now())

  @@index([companyId, status])
  @@index([campaignId])
}
```

### Deliverables
- [ ] EmailTemplate and EmailLog models
- [ ] Template CRUD API
- [ ] Campaign management API
- [ ] Email template editor UI
- [ ] Campaign builder UI
- [ ] Automated email sequence configuration
- [ ] Email analytics dashboard
- [ ] Resend/webhook integration for tracking

---

## Phase 3: Cleaner Portal Enhancement

### Objectives
- Mobile-first responsive design
- Real-time job updates
- Enhanced job workflow (checklist, photos)
- Performance tracking for cleaners
- Offline capability

### Components to Build

#### 3.1 Enhanced Cleaner Dashboard

**Today's View**
- Job cards with full details
- One-tap actions (On My Way, Clock In/Out, Complete)
- Navigation integration (Google Maps)
- Customer quick-call
- Job timer (automatic tracking)

**Schedule View**
- Weekly calendar
- Day/Week toggle
- Color-coded job status
- Availability management

**Performance View**
- Personal statistics
- Rating history
- Earnings summary
- Tip tracking

#### 3.2 Job Workflow Enhancement

```
Job Lifecycle:
SCHEDULED → ON_MY_WAY → CLOCKED_IN → IN_PROGRESS → CLOCKED_OUT → CLEANER_COMPLETED → COMPLETED

New Actions:
- Send "On My Way" notification to customer
- Clock in (with location verification)
- Interactive checklist completion
- Photo upload (before/after)
- Add job notes
- Clock out (auto-calculate duration)
- Submit for approval
```

#### 3.3 API Enhancements

```
/api/cleaner/dashboard           - Dashboard data
/api/cleaner/jobs                - Job list with filters
/api/cleaner/jobs/[id]/on-my-way - Send notification
/api/cleaner/jobs/[id]/clock-in  - Clock in with location
/api/cleaner/jobs/[id]/clock-out - Clock out
/api/cleaner/jobs/[id]/checklist - Update checklist
/api/cleaner/jobs/[id]/photos    - Upload photos
/api/cleaner/jobs/[id]/notes     - Add notes
/api/cleaner/jobs/[id]/complete  - Submit completion
/api/cleaner/performance         - Performance metrics
/api/cleaner/availability        - Get/set availability
/api/cleaner/profile             - Profile management
```

#### 3.4 Real-time Features

- Push notifications for new job assignments
- Real-time job updates
- Live location sharing (optional)
- Instant messaging with office

#### 3.5 Database Additions

```prisma
model JobPhoto {
  id         String   @id @default(cuid())
  bookingId  String
  booking    Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  type       String   // BEFORE, AFTER, ISSUE
  url        String
  caption    String?

  uploadedBy String
  uploadedAt DateTime @default(now())

  @@index([bookingId])
}

model CleanerLocation {
  id          String   @id @default(cuid())
  teamMemberId String
  teamMember  TeamMember @relation(fields: [teamMemberId], references: [id], onDelete: Cascade)

  latitude    Float
  longitude   Float
  accuracy    Float?

  recordedAt  DateTime @default(now())

  @@index([teamMemberId, recordedAt])
}
```

### Deliverables
- [ ] Redesigned mobile-first cleaner dashboard
- [ ] Enhanced job workflow with all actions
- [ ] Interactive checklist component
- [ ] Photo upload functionality
- [ ] Performance dashboard for cleaners
- [ ] Availability management UI
- [ ] Location tracking (optional)
- [ ] Push notification setup

---

## Phase 4: Customer Portal Enhancement

### Objectives
- Self-service booking system
- Online payment integration
- Booking management
- Referral program access
- Service preferences management

### Components to Build

#### 4.1 Customer Dashboard

**Home View**
- Upcoming bookings
- Quick re-book button
- Outstanding balance
- Referral credits balance
- Recent activity feed

**Bookings View**
- Booking history
- Upcoming bookings
- Cancel/reschedule options
- Booking details modal

**Payments View**
- Invoice history
- Outstanding invoices
- Payment methods management
- Auto-pay settings

#### 4.2 Self-Service Booking

```
Booking Flow:
1. Select service type (Standard, Deep, Move-out)
2. Select address (existing or add new)
3. Choose date/time from availability
4. Add special instructions
5. Apply referral credits (optional)
6. Review and confirm
7. Payment (if required)
8. Confirmation
```

#### 4.3 API Endpoints

```
/api/customer/dashboard          - Dashboard data
/api/customer/bookings           - Booking list
/api/customer/bookings/new       - Create booking
/api/customer/bookings/[id]      - Booking details
/api/customer/bookings/[id]/cancel - Cancel booking
/api/customer/bookings/[id]/reschedule - Reschedule
/api/customer/invoices           - Invoice list
/api/customer/invoices/[id]/pay  - Pay invoice
/api/customer/addresses          - Address management
/api/customer/preferences        - Service preferences
/api/customer/payment-methods    - Payment methods
/api/customer/referrals          - Referral dashboard
/api/customer/profile            - Profile management
```

#### 4.4 Referral Program Features

- Unique referral code per customer
- Track referral status
- View earned credits
- Apply credits to bookings
- Referral tier status (Bronze/Silver/Gold)
- Share referral link (SMS, Email, Copy)

#### 4.5 Communication Preferences

- Email notifications toggle
- SMS notifications toggle
- Marketing opt-in/out
- Reminder timing preferences

### Deliverables
- [ ] Customer dashboard page
- [ ] Self-service booking flow
- [ ] Booking management (cancel/reschedule)
- [ ] Invoice viewing and payment
- [ ] Address management
- [ ] Service preferences UI
- [ ] Referral program dashboard
- [ ] Payment methods management
- [ ] Communication preferences

---

## Phase 5: Progressive Web App (PWA)

### Objectives
- Installable on mobile devices
- Offline functionality
- Push notifications
- Native-like experience
- Fast loading times

### Components to Build

#### 5.1 PWA Configuration

**Manifest File**
```json
{
  "name": "AwesomeCRM",
  "short_name": "CRM",
  "description": "CRM for Cleaning Companies",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0070f3",
  "icons": [...]
}
```

**Service Worker**
- Cache static assets
- Cache API responses (with strategy)
- Background sync for offline actions
- Push notification handling

#### 5.2 Offline Capabilities

**For Cleaners**
- View today's jobs offline
- Complete checklist offline
- Queue photos for upload
- Sync when online

**For Customers**
- View upcoming bookings
- View past invoices
- Cached address book

#### 5.3 Push Notifications

**Notification Types**
- New job assigned (cleaner)
- Booking confirmation (customer)
- Reminder notifications
- Payment received (admin)
- Review received (admin)
- Cleaner on their way (customer)

**Implementation**
```
1. Request notification permission
2. Register service worker
3. Subscribe to push service
4. Store subscription in database
5. Send notifications via web-push
```

#### 5.4 Database Additions

```prisma
model PushSubscription {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  endpoint     String
  p256dh       String
  auth         String

  deviceType   String?  // mobile, desktop, tablet
  userAgent    String?

  isActive     Boolean  @default(true)

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([userId, endpoint])
  @@index([userId])
}
```

#### 5.5 Performance Optimizations

- Image optimization (next/image)
- Code splitting
- Route prefetching
- API response caching
- Lazy loading components
- Skeleton loading states

### Deliverables
- [ ] PWA manifest configuration
- [ ] Service worker implementation
- [ ] Offline data caching
- [ ] Background sync for offline actions
- [ ] Push notification system
- [ ] PushSubscription model
- [ ] Notification preferences UI
- [ ] Performance optimizations
- [ ] Install prompts (iOS/Android)

---

## Implementation Timeline

### Phase 1: Analytics (Current Sprint)
- Analytics API endpoints
- Dashboard components
- Data export
- Snapshot cron jobs

### Phase 2: Email
- Template system
- Campaign management
- Automated sequences
- Analytics tracking

### Phase 3: Cleaner
- Mobile dashboard redesign
- Enhanced workflow
- Photo uploads
- Performance tracking

### Phase 4: Customer
- Self-service booking
- Payment integration
- Referral program
- Preferences management

### Phase 5: PWA
- Service worker
- Push notifications
- Offline capabilities
- Performance optimization

---

## Technical Considerations

### Security
- All endpoints validate `companyId`
- Role-based access control on all routes
- Rate limiting per tenant
- Input validation with Zod
- CSRF protection

### Scalability
- Database indexes on `companyId` columns
- Pagination on all list endpoints
- Caching strategy for analytics
- Background jobs for heavy operations

### Monitoring
- Error tracking per tenant
- Performance metrics
- API usage analytics
- Audit logging

---

## Success Metrics

### Analytics
- [ ] Dashboard load time < 2s
- [ ] All KPIs calculated correctly
- [ ] Export functionality working

### Email
- [ ] Email delivery rate > 95%
- [ ] Template rendering correctly
- [ ] Campaign analytics accurate

### Cleaner
- [ ] Mobile usability score > 90
- [ ] Offline functionality working
- [ ] Photo upload success rate > 99%

### Customer
- [ ] Self-service booking completion > 80%
- [ ] Payment success rate > 98%
- [ ] Customer satisfaction > 4.5/5

### PWA
- [ ] Lighthouse PWA score > 90
- [ ] Offline functionality working
- [ ] Push notification delivery > 95%

---

## Next Steps

1. Review and approve this plan
2. Begin Phase 1: Analytics implementation
3. Regular progress reviews
4. Iterative deployment and feedback

**Ready to proceed with Phase 1: Analytics?**
