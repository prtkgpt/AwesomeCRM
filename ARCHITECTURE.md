# CleanerCRM - Architecture & Design

## 🎯 Product Vision
A $10/month CRM for solo home cleaners: "calendar + clients + payments + reminders" — nothing more.

---

## 🗄️ Database Schema (Prisma)

### User (Auth)
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String?
  phone         String?
  businessName  String?

  // For future team expansion
  workspaceId   String?   // nullable for now, single-user

  clients       Client[]
  bookings      Booking[]
  messages      Message[]
  messageTemplates MessageTemplate[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Client
```prisma
model Client {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  name          String
  email         String?
  phone         String?
  tags          String[]  // ["VIP", "Weekly", "Monthly", "Pain"]
  notes         String?   // General client notes

  addresses     Address[]
  bookings      Booking[]

  // Stripe customer ID for payment storage
  stripeCustomerId String?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([userId])
}
```

### Address
```prisma
model Address {
  id            String    @id @default(cuid())
  clientId      String
  client        Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)

  label         String?   // "Home", "Office", etc.
  street        String
  city          String
  state         String
  zip           String

  // Cleaner-specific notes
  parkingInfo   String?
  gateCode      String?
  petInfo       String?
  preferences   String?   // "Remove shoes", "Back door", etc.

  bookings      Booking[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([clientId])
}
```

### Booking (Job)
```prisma
enum BookingStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum ServiceType {
  STANDARD
  DEEP
  MOVE_OUT
}

enum RecurrenceFrequency {
  NONE
  WEEKLY
  BIWEEKLY
  MONTHLY
}

model Booking {
  id              String          @id @default(cuid())
  userId          String
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  clientId        String
  client          Client          @relation(fields: [clientId], references: [id], onDelete: Cascade)

  addressId       String
  address         Address         @relation(fields: [addressId], references: [id])

  // Scheduling
  scheduledDate   DateTime
  duration        Int             // minutes

  // Service details
  serviceType     ServiceType     @default(STANDARD)
  status          BookingStatus   @default(SCHEDULED)

  // Pricing
  price           Float
  isPaid          Boolean         @default(false)
  paymentMethod   String?         // "card", "cash", "check", "zelle"
  paidAt          DateTime?

  // Stripe
  stripePaymentIntentId String?
  stripePaymentLink     String?

  // Recurrence
  isRecurring     Boolean         @default(false)
  recurrenceFrequency RecurrenceFrequency @default(NONE)
  recurrenceParentId  String?     // Points to the original booking if this is a generated instance
  recurrenceEndDate   DateTime?   // When to stop generating

  // Notes
  notes           String?
  internalNotes   String?         // Private notes not shared with client

  // Messaging tracking
  confirmationSent Boolean       @default(false)
  reminderSent     Boolean       @default(false)

  messages        Message[]

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([userId, scheduledDate])
  @@index([clientId])
  @@index([status])
}
```

### Message (Twilio Log)
```prisma
enum MessageStatus {
  SENT
  DELIVERED
  FAILED
  PENDING
}

enum MessageType {
  CONFIRMATION
  REMINDER
  ON_MY_WAY
  THANK_YOU
  PAYMENT_REQUEST
  CUSTOM
}

model Message {
  id            String        @id @default(cuid())
  userId        String
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  bookingId     String?
  booking       Booking?      @relation(fields: [bookingId], references: [id], onDelete: SetNull)

  to            String        // Phone number
  from          String        // Twilio number
  body          String

  type          MessageType   @default(CUSTOM)
  status        MessageStatus @default(PENDING)

  // Twilio metadata
  twilioSid     String?       @unique
  errorMessage  String?

  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([userId])
  @@index([bookingId])
}
```

### MessageTemplate
```prisma
model MessageTemplate {
  id            String      @id @default(cuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  type          MessageType
  name          String
  template      String      // Template with variables: {{clientName}}, {{date}}, {{time}}

  isActive      Boolean     @default(true)

  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@index([userId, type])
}
```

---

## 🏗️ Application Architecture

### Directory Structure
```
/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── signup/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx      # Main app layout with navigation
│   │   │   ├── calendar/
│   │   │   │   └── page.tsx
│   │   │   ├── jobs/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── new/
│   │   │   │       └── page.tsx
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── new/
│   │   │   │       └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts
│   │   │   ├── clients/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── bookings/
│   │   │   │   ├── route.ts
│   │   │   │   ├── [id]/
│   │   │   │   │   └── route.ts
│   │   │   │   └── recurring/
│   │   │   │       └── route.ts
│   │   │   ├── calendar/
│   │   │   │   └── route.ts
│   │   │   ├── payments/
│   │   │   │   ├── create-link/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── webhook/
│   │   │   │   │   └── route.ts
│   │   │   │   └── mark-paid/
│   │   │   │       └── route.ts
│   │   │   ├── messages/
│   │   │   │   ├── send/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── templates/
│   │   │   │   │   └── route.ts
│   │   │   │   └── webhook/
│   │   │   │       └── route.ts
│   │   │   ├── reports/
│   │   │   │   └── route.ts
│   │   │   └── cron/
│   │   │       └── reminders/
│   │   │           └── route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx            # Landing/redirect
│   ├── components/
│   │   ├── ui/                 # Shadcn components
│   │   ├── calendar/
│   │   ├── clients/
│   │   ├── bookings/
│   │   └── layout/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── stripe.ts
│   │   ├── twilio.ts
│   │   ├── utils.ts
│   │   └── validations.ts
│   └── types/
│       └── index.ts
├── public/
├── .env.local
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

---

## 🛣️ Routes & Pages

### Public Routes
- `/` - Landing page (redirects to /calendar if logged in)
- `/login` - Email/password login
- `/signup` - New account creation

### Protected Routes (Dashboard)
- `/calendar` - Day/week calendar views
- `/jobs` - List all bookings (upcoming/past tabs)
- `/jobs/new` - Create new booking
- `/jobs/[id]` - View/edit booking details
- `/clients` - List all clients
- `/clients/new` - Create new client
- `/clients/[id]` - View client details + booking history
- `/settings` - User settings, message templates, integrations

---

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/signup
  Body: { email, password, name, phone?, businessName? }
  Response: { user: User }

POST /api/auth/login (handled by NextAuth)
GET  /api/auth/session (handled by NextAuth)
POST /api/auth/signout (handled by NextAuth)
```

### Clients
```
GET  /api/clients
  Query: ?search=string&tags=VIP,Weekly
  Response: { clients: Client[] }

POST /api/clients
  Body: { name, email?, phone?, tags?, addresses: [{ street, city, state, zip, parkingInfo?, gateCode?, petInfo?, preferences? }] }
  Response: { client: Client }

GET  /api/clients/[id]
  Response: { client: Client, addresses: Address[], bookings: Booking[] }

PUT  /api/clients/[id]
  Body: { name?, email?, phone?, tags?, notes? }
  Response: { client: Client }

DELETE /api/clients/[id]
  Response: { success: boolean }
```

### Addresses
```
POST /api/clients/[id]/addresses
  Body: { street, city, state, zip, label?, parkingInfo?, gateCode?, petInfo?, preferences? }
  Response: { address: Address }

PUT  /api/clients/[clientId]/addresses/[id]
  Body: { street?, city?, ... }
  Response: { address: Address }

DELETE /api/clients/[clientId]/addresses/[id]
  Response: { success: boolean }
```

### Bookings
```
GET  /api/bookings
  Query: ?status=SCHEDULED&from=2024-01-01&to=2024-01-31
  Response: { bookings: Booking[] }

POST /api/bookings
  Body: {
    clientId,
    addressId,
    scheduledDate,
    duration,
    serviceType,
    price,
    notes?,
    isRecurring?,
    recurrenceFrequency?,
    recurrenceEndDate?
  }
  Response: { booking: Booking, generatedBookings?: Booking[] }

GET  /api/bookings/[id]
  Response: { booking: Booking, client: Client, address: Address }

PUT  /api/bookings/[id]
  Body: { scheduledDate?, duration?, price?, status?, notes? }
  Response: { booking: Booking }

DELETE /api/bookings/[id]
  Response: { success: boolean }

POST /api/bookings/[id]/complete
  Response: { booking: Booking }

POST /api/bookings/recurring
  Body: { bookingId } // Generate instances for a recurring booking
  Response: { generatedBookings: Booking[] }
```

### Calendar
```
GET  /api/calendar
  Query: ?date=2024-01-15&view=day|week
  Response: {
    bookings: Booking[],
    conflicts: { bookingId: string, overlaps: string[] }[]
  }
```

### Payments
```
POST /api/payments/create-link
  Body: { bookingId }
  Response: { paymentLink: string }

POST /api/payments/mark-paid
  Body: { bookingId, paymentMethod: "cash"|"check"|"zelle", paidAt? }
  Response: { booking: Booking }

POST /api/payments/webhook (Stripe webhook)
  Headers: stripe-signature
  Response: { received: true }
```

### Messages
```
GET  /api/messages
  Query: ?bookingId=xxx
  Response: { messages: Message[] }

POST /api/messages/send
  Body: { to, body, bookingId?, type? }
  Response: { message: Message }

GET  /api/messages/templates
  Response: { templates: MessageTemplate[] }

PUT  /api/messages/templates/[id]
  Body: { template, isActive? }
  Response: { template: MessageTemplate }

POST /api/messages/webhook (Twilio webhook)
  Response: { received: true }
```

### Reports
```
GET  /api/reports
  Query: ?period=week|month
  Response: {
    revenue: number,
    completedJobs: number,
    unpaidAmount: number,
    upcomingJobs: number
  }
```

### Cron/Background Jobs
```
GET /api/cron/reminders
  Headers: Authorization: Bearer CRON_SECRET
  Response: { sent: number, failed: number }

  Logic:
  - Find bookings scheduled 24h from now that haven't had reminder sent
  - Send SMS using reminder template
  - Mark reminderSent = true
```

---

## 🎨 UI Components

### Mobile-First Navigation (Bottom Tabs)
```
┌─────────────────────────┐
│      Page Content       │
│                         │
│                         │
└─────────────────────────┘
┌─────────────────────────┐
│ 📅  💼   👥   ⚙️       │
│ Cal Jobs Clients Set    │
└─────────────────────────┘
```

### Key Reusable Components
- `<CalendarGrid />` - Day/week view with time slots
- `<BookingCard />` - Job display with status badge
- `<ClientCard />` - Client list item
- `<QuickActionButton />` - "New Job", "Send Message", etc.
- `<StatusBadge />` - Color-coded booking status
- `<AddressSelector />` - Dropdown with client addresses
- `<RecurrenceForm />` - Recurring booking configuration
- `<MessageTemplateEditor />` - Edit message templates with variables
- `<PaymentButton />` - Request payment / mark paid
- `<ReportCard />` - Revenue/stats display

---

## 🔐 Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Twilio
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1234567890"

# Cron Secret (for Vercel Cron)
CRON_SECRET="random-secret-for-cron-auth"
```

---

## 🚀 Deployment Strategy

### Vercel (Recommended)
1. Connect GitHub repo
2. Add environment variables
3. Deploy (auto-detects Next.js)
4. Set up Vercel Cron for reminders:
   ```json
   // vercel.json
   {
     "crons": [{
       "path": "/api/cron/reminders",
       "schedule": "0 * * * *"
     }]
   }
   ```

### Database (Vercel Postgres or Railway)
- Vercel Postgres: One-click setup
- Railway: Free tier for MVP
- Supabase: Alternative with generous free tier

---

## 📱 User Flows

### Quick Job Creation (30 seconds)
1. Tap "New Job" from calendar
2. Select client (or create new)
3. Select address from client's addresses
4. Pick date/time from prefilled slot
5. Enter price
6. Tap "Create & Send Confirmation"
7. Done - confirmation SMS sent automatically

### Payment Collection
1. After job completion, tap "Request Payment"
2. Choose: Send Stripe link OR mark as cash
3. If Stripe: SMS sent with payment link
4. Customer pays on phone
5. Auto-marked as paid via webhook

### Recurring Jobs
1. Create first booking
2. Toggle "Recurring"
3. Select frequency (weekly/biweekly/monthly)
4. Set end date or leave blank
5. System generates future bookings automatically
6. Each can be edited/cancelled independently

---

## 🧪 Testing Priorities

### Critical Paths (Must Work Perfectly)
1. Login → Create Client → Book Job → Mark Complete
2. Send payment link → Receive payment → Update status
3. Create recurring job → View future instances
4. Send reminder 24h before job

### Edge Cases
- Overlapping bookings warning
- Client with no addresses
- Recurring job with past end date
- Failed SMS delivery handling
- Stripe webhook duplicate events

---

## 🔄 Future Expansion Hooks

The schema is designed to support:
- **Teams**: Add `workspace` table, update `userId` to `workspaceId`
- **Helpers**: Add `assignedTo` field on bookings
- **Advanced scheduling**: Add `route_optimization` field
- **Inventory**: Separate `supplies` table
- **Custom services**: Make `serviceType` more flexible

But for MVP: **ONE USER, ONE WORKSPACE, SIMPLE AND FAST**.

---

## ✅ Success Metrics

- User can sign up and book first job in < 10 minutes
- Mobile-first: 90%+ of actions doable on phone
- Performance: Pages load < 1s on 3G
- Cost: < $5/month server costs per user (at scale)

---

This architecture balances simplicity for MVP with smart design choices that allow future growth without major rewrites.
