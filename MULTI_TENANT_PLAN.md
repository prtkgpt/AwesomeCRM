# Multi-Tenant CRM Implementation Plan

## 🎯 Goal
Transform CleanDayCRM into a multi-tenant SaaS where each cleaning company has:
- Unique URL: `cleandaycrm.com/{company-slug}/`
- 3 role-based portals: `/office-staff`, `/clean-team`, `/customer`
- Complete data isolation between companies

---

## 📊 Database Schema Changes

### New Models

#### 1. Company (Tenant/Workspace)
```prisma
model Company {
  id              String   @id @default(cuid())
  name            String              // "Acme Cleaning"
  slug            String   @unique    // "acme-cleaning" (for URL)

  // Contact Info
  email           String?
  phone           String?
  address         String?

  // Branding
  logo            String?             // URL to logo
  primaryColor    String?             // Hex color

  // Settings
  timezone        String   @default("America/New_York")
  currency        String   @default("USD")

  // Subscription
  plan            String   @default("FREE")  // FREE, BASIC, PRO
  subscriptionStatus String @default("ACTIVE")

  users           User[]
  clients         Client[]
  bookings        Booking[]
  teamMembers     TeamMember[]
  invitations     Invitation[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([slug])
}
```

#### 2. UserRole (Enum)
```prisma
enum UserRole {
  OWNER          // Company creator, full access
  ADMIN          // Office staff, manage operations
  CLEANER        // Field worker, view assigned jobs
  CUSTOMER       // End customer, view/book services
}
```

#### 3. TeamMember (Cleaner Details)
```prisma
model TeamMember {
  id                String    @id @default(cuid())
  companyId         String
  company           Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)

  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id])

  // Employment Info
  hourlyRate        Float?
  employeeId        String?           // Internal ID
  hireDate          DateTime?

  // Personal Info
  emergencyContact  String?
  emergencyPhone    String?
  photo             String?           // Profile photo URL

  // Work Info
  specialties       String[]          // ["Deep Clean", "Move-out"]
  availability      Json?             // Weekly schedule

  // Assignment
  assignedBookings  Booking[]

  isActive          Boolean   @default(true)

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([companyId])
  @@index([userId])
}
```

#### 4. Invitation (User Invites)
```prisma
model Invitation {
  id            String      @id @default(cuid())
  companyId     String
  company       Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)

  email         String
  role          UserRole
  token         String      @unique

  invitedBy     String      // User ID who sent invite

  status        String      @default("PENDING")  // PENDING, ACCEPTED, EXPIRED
  expiresAt     DateTime

  createdAt     DateTime    @default(now())

  @@index([token])
  @@index([companyId, email])
}
```

### Updated Models

#### User (Add company & role)
```prisma
model User {
  // Add these fields:
  companyId     String
  company       Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)

  role          UserRole    @default(CUSTOMER)

  // Cleaner profile (if role = CLEANER)
  teamMember    TeamMember?

  // Customer profile (if role = CUSTOMER)
  customerBookings Booking[] @relation("CustomerBookings")

  @@index([companyId, role])
}
```

#### Booking (Add assignee)
```prisma
model Booking {
  // Add this field:
  assignedTo    String?
  assignee      TeamMember? @relation(fields: [assignedTo], references: [id])

  // Keep existing userId (who created the booking)
  // Add companyId for tenant isolation
  companyId     String
  company       Company     @relation(fields: [companyId], references: [id])
}
```

#### Client (Add company)
```prisma
model Client {
  // Add this field:
  companyId     String
  company       Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)

  // Optional: Link to User if customer signs up
  userId        String?     @unique
  customerUser  User?       @relation(fields: [userId], references: [id])
}
```

---

## 🚀 Implementation Phases

### Phase 1: Database Migration ✅ (Current)
- [ ] Create new schema file with multi-tenancy
- [ ] Generate migration
- [ ] Update Prisma types
- [ ] Deploy to Neon

### Phase 2: Company Signup Flow
- [ ] Create `/signup` page (company + owner)
- [ ] Generate unique slug from company name
- [ ] Create Company + Owner user
- [ ] Redirect to `/{slug}/office-staff`

### Phase 3: Route Structure
```
/signup                          → Company signup
/login                           → Login (redirects based on role)
/{slug}/office-staff/*           → Admin dashboard
/{slug}/clean-team/*             → Cleaner dashboard
/{slug}/customer/*               → Customer portal
/{slug}/invite/{token}           → Accept invitation
/{slug}/estimate/{id}            → View estimate (no auth)
```

### Phase 4: Access Control Middleware
```typescript
// Middleware to check:
// 1. User is authenticated
// 2. User belongs to company in URL
// 3. User has correct role for portal
```

### Phase 5: Office Staff Portal
- [ ] Dashboard (current functionality)
- [ ] Add Team Members page
- [ ] Invite cleaners/office staff
- [ ] Assign jobs to cleaners
- [ ] View all company data

### Phase 6: Cleaner Portal
- [ ] Mobile-first dashboard
- [ ] "My Jobs Today" view
- [ ] Mark job as complete
- [ ] Add job notes
- [ ] View upcoming schedule
- [ ] Update profile

### Phase 7: Customer Portal
- [ ] View estimate (public link)
- [ ] Sign up to book
- [ ] My bookings
- [ ] Book new service
- [ ] Pay invoices
- [ ] View history

---

## 🔒 Security & Isolation

### Tenant Isolation Strategy
Every query must filter by `companyId`:

```typescript
// Example: Get all bookings
const bookings = await prisma.booking.findMany({
  where: {
    companyId: user.companyId,  // ← Always required
    // ... other filters
  }
});
```

### Access Control Rules
```
OWNER:     Full access to everything in their company
ADMIN:     Same as OWNER (office staff)
CLEANER:   Can only view/edit their assigned jobs
CUSTOMER:  Can only view/edit their own bookings
```

---

## 📱 UI/UX Improvements

### Landing Page
```
cleandaycrm.com
├── Hero: "CRM for Cleaning Companies"
├── Features
├── Pricing
└── [Get Started] → /signup
```

### Company-Specific Branding
- Each company can upload logo
- Custom primary color
- Personalized customer portal

---

## 🎨 Dashboard Designs

### Office Staff (`/{slug}/office-staff`)
- Keep current dashboard design
- Add "Team" section in sidebar
- Add "Assign Cleaner" to job creation

### Cleaner (`/{slug}/clean-team`)
- Mobile-first cards
- Today's jobs at top
- Swipe to complete
- Map integration for addresses

### Customer (`/{slug}/customer`)
- Clean, simple interface
- Booking calendar
- Payment portal
- Service history

---

## 🚢 Migration Strategy

### For Existing Data
```sql
-- Create default company for existing users
INSERT INTO Company (name, slug) VALUES ('Demo Company', 'demo');

-- Update existing users to belong to demo company
UPDATE User SET companyId = 'demo-company-id', role = 'OWNER';

-- Update all existing data to belong to demo company
UPDATE Client SET companyId = 'demo-company-id';
UPDATE Booking SET companyId = 'demo-company-id';
-- etc...
```

---

## ✅ Success Criteria

- [ ] Companies can sign up independently
- [ ] Complete data isolation between companies
- [ ] 3 distinct portals with appropriate access
- [ ] Cleaners can view/complete assigned jobs
- [ ] Customers can view estimates and book
- [ ] Mobile-optimized for cleaners
- [ ] No cross-tenant data leaks

---

## 📝 Next Steps

1. Review and approve this plan
2. Update schema.prisma
3. Generate migration
4. Start with signup flow
5. Build portals one by one

**Ready to proceed?**
