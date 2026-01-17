// ============================================
// CleanDayCRM - TypeScript Type Definitions
// ============================================

import type {
  User as PrismaUser,
  Company as PrismaCompany,
  Client as PrismaClient,
  Booking as PrismaBooking,
  TeamMember as PrismaTeamMember,
  Address as PrismaAddress,
  Invoice as PrismaInvoice,
  Payment as PrismaPayment,
  Message as PrismaMessage,
  Review as PrismaReview,
  Service as PrismaService,
  GiftCard as PrismaGiftCard,
  Promotion as PrismaPromotion,
  InventoryItem as PrismaInventoryItem,
  QualityCheck as PrismaQualityCheck,
  Location as PrismaLocation,
} from '@prisma/client';

// ============================================
// Enums (re-export from Prisma)
// ============================================

export {
  UserRole,
  BookingStatus,
  ServiceType,
  RecurrenceFrequency,
  PaymentStatus,
  PaymentMethod,
  InvoiceStatus,
  MessageType,
  MessageChannel,
  MessageStatus,
  ReferralTier,
  LoyaltyTier,
  CreditType,
  CreditStatus,
  QualityCheckStatus,
  CertificationStatus,
  InventoryMovementType,
  BackupStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';

// ============================================
// Base Types (from Prisma)
// ============================================

export type User = PrismaUser;
export type Company = PrismaCompany;
export type Client = PrismaClient;
export type Booking = PrismaBooking;
export type TeamMember = PrismaTeamMember;
export type Address = PrismaAddress;
export type Invoice = PrismaInvoice;
export type Payment = PrismaPayment;
export type Message = PrismaMessage;
export type Review = PrismaReview;
export type Service = PrismaService;
export type GiftCard = PrismaGiftCard;
export type Promotion = PrismaPromotion;
export type InventoryItem = PrismaInventoryItem;
export type QualityCheck = PrismaQualityCheck;
export type Location = PrismaLocation;

// ============================================
// Session & Auth Types
// ============================================

export interface SessionUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null; // Backward compatible - computed from firstName + lastName
  role: 'OWNER' | 'ADMIN' | 'CLEANER' | 'CLIENT';
  companyId: string;
  avatar?: string | null;
  theme?: string;
}

export interface AuthSession {
  user: SessionUser;
  expires: string;
}

// NextAuth extension
declare module 'next-auth' {
  interface Session {
    user: SessionUser;
  }

  interface User {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    role: string;
    companyId: string;
    avatar?: string | null;
    theme?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    companyId: string;
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
    theme?: string;
  }
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================
// Dashboard Types
// ============================================

export interface DashboardStats {
  // Revenue
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  revenueChange: number;

  // Bookings
  todayBookings: number;
  weekBookings: number;
  pendingBookings: number;
  completedBookings: number;
  cancelledBookings: number;

  // Clients
  totalClients: number;
  newClientsThisMonth: number;
  activeClients: number;

  // Team
  totalTeamMembers: number;
  activeCleaners: number;
  availableCleaners: number;

  // Ratings
  averageRating: number;
  totalReviews: number;

  // Credits & Referrals
  totalCreditsIssued: number;
  totalReferrals: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
}

export interface RevenueChartData {
  daily: ChartDataPoint[];
  weekly: ChartDataPoint[];
  monthly: ChartDataPoint[];
}

// ============================================
// Booking Types
// ============================================

export interface BookingWithRelations extends PrismaBooking {
  // Backward compatible aliases
  price?: number; // Alias for finalPrice
  notes?: string; // Alias for customerNotes
  assignee?: any; // Alias for assignedCleaner
  onMyWaySentAt?: Date | null; // Alias for onMyWayAt
  feedbackLinkSentAt?: Date | null; // Alias for feedbackSentAt
  hasInsuranceCoverage?: boolean; // Alias for hasInsurance
  copayPaid?: boolean; // Computed from payment status
  finalCopayAmount?: number; // Alias for copayAmount
  tipPaidVia?: string | null; // Payment method info

  client: PrismaClient & {
    addresses?: PrismaAddress[];
    preferences?: ClientPreference | null;
    name?: string; // Computed from firstName + lastName
    stripePaymentMethodId?: string | null; // Alias for defaultPaymentMethodId
  };
  address: PrismaAddress;
  assignedCleaner?: (PrismaTeamMember & {
    user: Pick<PrismaUser, 'id' | 'firstName' | 'lastName' | 'email' | 'phone'>;
  }) | null;
  service?: PrismaService | null;
  location?: PrismaLocation | null;
  checklist?: JobChecklist | null;
  photos?: BookingPhoto[];
  reviews?: PrismaReview[];
  payments?: PrismaPayment[];
}

export interface CreateBookingInput {
  clientId: string;
  addressId: string;
  serviceId?: string;
  serviceType: string;
  scheduledDate: string;
  duration: number;
  assignedCleanerId?: string;
  basePrice: number;
  addons?: BookingAddon[];
  customerNotes?: string;
  internalNotes?: string;
  isRecurring?: boolean;
  recurrenceFrequency?: string;
  recurrenceEndDate?: string;
}

export interface BookingAddon {
  name: string;
  price: number;
  quantity: number;
}

export interface BookingFilters {
  status?: string[];
  serviceType?: string[];
  cleanerId?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  isPaid?: boolean;
}

// Legacy compatibility
export type BookingWithMessages = PrismaBooking & {
  client: PrismaClient;
  address: PrismaAddress;
  messages: PrismaMessage[];
};

// ============================================
// Client Types
// ============================================

export interface ClientWithRelations extends PrismaClient {
  addresses: PrismaAddress[];
  preferences?: ClientPreference | null;
  bookings?: PrismaBooking[];
  referredBy?: PrismaClient | null;
  referrals?: PrismaClient[];
}

export type ClientWithAddresses = PrismaClient & {
  addresses: PrismaAddress[];
  // Backward compatible aliases
  name?: string; // Computed from firstName + lastName
  helperBeesReferralId?: string | null; // Alias for referredById
  standardCopayAmount?: number | null; // Alias for standardCopay
  hasDiscountedCopay?: boolean; // Computed from discountedCopay
  copayDiscountAmount?: number | null; // Alias for discountedCopay
  stripePaymentMethodId?: string | null; // Alias for defaultPaymentMethodId
};

export interface ClientPreference {
  id: string;
  clientId: string;
  cleaningSequence?: string | null;
  priorityAreas?: string | null;
  areasToAvoid?: string | null;
  productAllergies?: string | null;
  preferredProducts?: string | null;
  customerProvidesProducts: boolean;
  avoidScents: boolean;
  scentPreferences?: string | null;
  ecoFriendlyOnly: boolean;
  petHandlingInstructions?: string | null;
  petFeedingRequired: boolean;
  petFeedingInstructions?: string | null;
  petsSecuredDuring: boolean;
  petSecuringInstructions?: string | null;
  preferredCleaner?: string | null;
  languagePreference?: string | null;
  communicationNotes?: string | null;
  temperaturePreference?: string | null;
  musicPreference?: string | null;
  doNotDisturb?: string | null;
  plantWatering: boolean;
  plantInstructions?: string | null;
  mailCollection: boolean;
  trashTakeout: boolean;
  otherTasks?: string | null;
  lastVisitNotes?: string | null;
  lastVisitDate?: Date | null;
}

export interface CreateClientInput {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  preferredContactMethod?: string;
  tags?: string[];
  source?: string;
  notes?: string;
  address?: CreateAddressInput;
}

export interface CreateAddressInput {
  label?: string;
  isPrimary?: boolean;
  street: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  propertyType?: string;
  squareFootage?: number;
  bedrooms?: number;
  bathrooms?: number;
  hasPets?: boolean;
  petDetails?: string;
  parkingInfo?: string;
  gateCode?: string;
  entryInstructions?: string;
}

// ============================================
// Team Member Types
// ============================================

export interface TeamMemberWithRelations extends PrismaTeamMember {
  user: Pick<PrismaUser, 'id' | 'email' | 'firstName' | 'lastName' | 'phone' | 'avatar' | 'isActive'>;
  location?: PrismaLocation | null;
  assignedBookings?: PrismaBooking[];
}

// Legacy compatibility
export type TeamMemberWithUser = PrismaTeamMember & {
  user: PrismaUser;
};

export interface CreateTeamMemberInput {
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  role: 'ADMIN' | 'CLEANER';
  hourlyRate?: number;
  specialties?: string[];
  serviceAreas?: string[];
}

export interface TeamMemberAvailability {
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;
}

export interface DayAvailability {
  enabled: boolean;
  start: string;
  end: string;
}

export interface TeamMemberPerformance {
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  averageRating: number;
  totalReviews: number;
  onTimePercentage: number;
  totalEarnings: number;
  averageJobDuration: number;
  customerSatisfaction: number;
}

// ============================================
// Checklist Types
// ============================================

export interface JobChecklist {
  id: string;
  bookingId: string;
  items: ChecklistItems;
  totalTasks: number;
  completedTasks: number;
  startedAt?: Date | null;
  completedAt?: Date | null;
}

export interface ChecklistItems {
  [area: string]: ChecklistTask[];
}

export interface ChecklistTask {
  id: string;
  task: string;
  required: boolean;
  completed: boolean;
  completedAt?: string;
  notes?: string;
  photoUrl?: string;
}

export interface ChecklistTemplateType {
  id: string;
  companyId: string;
  serviceId?: string;
  name: string;
  description?: string;
  items: ChecklistItems;
  isDefault: boolean;
  isActive: boolean;
}

// ============================================
// Photo Types
// ============================================

export interface BookingPhoto {
  id: string;
  bookingId: string;
  type: 'BEFORE' | 'AFTER' | 'ISSUE' | 'CHECKLIST';
  area?: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  uploadedById?: string;
  verifiedAt?: Date;
  verifiedById?: string;
  createdAt: Date;
}

// ============================================
// Payment Types
// ============================================

export interface PaymentWithRelations extends PrismaPayment {
  client: Pick<PrismaClient, 'id' | 'firstName' | 'lastName' | 'email'>;
  booking?: Pick<PrismaBooking, 'id' | 'bookingNumber' | 'scheduledDate'> | null;
  invoice?: Pick<PrismaInvoice, 'id' | 'invoiceNumber'> | null;
}

export interface CreatePaymentInput {
  clientId: string;
  bookingId?: string;
  invoiceId?: string;
  amount: number;
  method: string;
  notes?: string;
}

// ============================================
// Invoice Types
// ============================================

export interface InvoiceWithRelations extends PrismaInvoice {
  client: Pick<PrismaClient, 'id' | 'firstName' | 'lastName' | 'email' | 'phone'>;
  booking?: BookingWithRelations | null;
  payments: PrismaPayment[];
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxable: boolean;
}

export interface CreateInvoiceInput {
  clientId: string;
  bookingId?: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  notes?: string;
  terms?: string;
}

// ============================================
// Message Types
// ============================================

export interface MessageWithRelations extends PrismaMessage {
  booking?: Pick<PrismaBooking, 'id' | 'bookingNumber'> | null;
}

export interface SendMessageInput {
  to: string;
  body: string;
  type?: string;
  channel: 'SMS' | 'EMAIL';
  bookingId?: string;
  subject?: string;
}

export interface MessageTemplateType {
  id: string;
  companyId: string;
  type: string;
  channel: string;
  name: string;
  subject?: string;
  body: string;
  isDefault: boolean;
  isActive: boolean;
}

export type MessageVariables = {
  clientName: string;
  date: string;
  time: string;
  price: string;
  address: string;
  businessName?: string;
  cleanerName?: string;
  bookingNumber?: string;
};

// ============================================
// Service & Pricing Types
// ============================================

export interface ServiceWithRelations extends PrismaService {
  pricingRules?: PricingRule[];
  checklists?: ChecklistTemplateType[];
}

export interface PricingRule {
  id: string;
  companyId: string;
  serviceId?: string;
  type: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  priceType: string;
  quantity?: number;
  minValue?: number;
  maxValue?: number;
  frequency?: string;
  dayOfWeek?: string;
  timeSlot?: string;
  isActive: boolean;
  isPublic: boolean;
  sortOrder: number;
}

export interface PriceCalculation {
  basePrice: number;
  addons: { name: string; price: number }[];
  subtotal: number;
  discountAmount: number;
  discountCode?: string;
  taxAmount: number;
  creditsApplied: number;
  finalPrice: number;
  estimatedDuration: number;
}

// ============================================
// Gift Card & Promotion Types
// ============================================

export interface GiftCardWithRelations extends PrismaGiftCard {
  transactions?: GiftCardTransaction[];
}

export interface GiftCardTransaction {
  id: string;
  giftCardId: string;
  clientId?: string;
  type: string;
  amount: number;
  balance: number;
  bookingId?: string;
  notes?: string;
  createdAt: Date;
}

export interface CreateGiftCardInput {
  initialAmount: number;
  recipientName?: string;
  recipientEmail?: string;
  personalMessage?: string;
  purchaserName?: string;
  purchaserEmail?: string;
}

export interface ApplyPromotionResult {
  valid: boolean;
  discountAmount: number;
  discountType: string;
  message?: string;
}

// ============================================
// Inventory Types
// ============================================

export interface InventoryItemWithRelations extends PrismaInventoryItem {
  location?: PrismaLocation | null;
  movements?: InventoryMovement[];
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  type: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  referenceType?: string;
  referenceId?: string;
  unitCost?: number;
  totalCost?: number;
  notes?: string;
  recordedById?: string;
  createdAt: Date;
}

export interface CreateInventoryItemInput {
  name: string;
  sku?: string;
  description?: string;
  category?: string;
  quantity: number;
  unit?: string;
  reorderLevel?: number;
  reorderQuantity?: number;
  unitCost?: number;
  vendorName?: string;
  locationId?: string;
}

// ============================================
// Quality Assurance Types
// ============================================

export interface QualityCheckWithRelations extends PrismaQualityCheck {
  booking: BookingWithRelations;
  cleaner: TeamMemberWithRelations;
  checker?: Pick<PrismaUser, 'id' | 'firstName' | 'lastName'> | null;
}

export interface QualityCheckResults {
  [area: string]: {
    [item: string]: {
      passed: boolean;
      notes?: string;
      photoUrl?: string;
    };
  };
}

export interface QualityIssue {
  area: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  photoUrl?: string;
}

// ============================================
// Report Types
// ============================================

export type ReportPeriod = 'day' | 'week' | 'month' | 'year';

export interface ReportParams {
  startDate: string;
  endDate: string;
  filters?: Record<string, unknown>;
}

export type ReportData = {
  revenue: number;
  completedJobs: number;
  unpaidAmount: number;
  upcomingJobs: number;
  period: ReportPeriod;
};

export interface RevenueReport {
  totalRevenue: number;
  byService: { service: string; amount: number }[];
  byPaymentMethod: { method: string; amount: number }[];
  byMonth: { month: string; amount: number }[];
  topClients: { client: string; amount: number }[];
}

export interface TeamPerformanceReport {
  members: {
    id: string;
    name: string;
    jobsCompleted: number;
    averageRating: number;
    revenue: number;
    onTimePercentage: number;
  }[];
}

export interface ClientAnalyticsReport {
  totalClients: number;
  newClients: number;
  churnedClients: number;
  retentionRate: number;
  averageLifetimeValue: number;
  bySource: { source: string; count: number }[];
  byTier: { tier: string; count: number }[];
}

// ============================================
// Company Settings Types
// ============================================

export interface CompanySettings {
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  website?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  language: string;
  businessTypes: string[];
  operatingHours?: OperatingHours;
  features: FeatureFlags;
}

export interface OperatingHours {
  [day: string]: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface FeatureFlags {
  insuranceBilling?: boolean;
  recurringBookings?: boolean;
  teamManagement?: boolean;
  onlineBooking?: boolean;
  loyaltyProgram?: boolean;
  referralProgram?: boolean;
  inventoryManagement?: boolean;
  qualityAssurance?: boolean;
  photoDocumentation?: boolean;
  multiLocation?: boolean;
  giftCards?: boolean;
  apiAccess?: boolean;
}

export interface BookingSettings {
  onlineBookingEnabled: boolean;
  minimumLeadTime: number;
  maximumLeadTime: number;
  requireApproval: boolean;
  requireDeposit: boolean;
  depositPercent: number;
  allowInstantBooking: boolean;
}

export interface ReminderSettings {
  customerReminderEnabled: boolean;
  customerReminderHours: number;
  cleanerReminderEnabled: boolean;
  cleanerReminderHours: number;
  morningReminderEnabled: boolean;
  morningReminderTime: string;
}

export interface ReferralSettings {
  referralEnabled: boolean;
  referralReferrerReward: number;
  referralRefereeReward: number;
  referralCreditExpiry: number;
}

export interface LoyaltySettings {
  loyaltyEnabled: boolean;
  loyaltyPointsPerDollar: number;
  loyaltyPointsValue: number;
}

// ============================================
// Calendar Types
// ============================================

export type CalendarView = 'day' | 'week' | 'month';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  type: 'booking' | 'blocked' | 'holiday';
  status?: string;
  clientName?: string;
  cleanerName?: string;
  address?: string;
  color?: string;
  booking?: BookingWithRelations;
}

export type TimeSlot = {
  time: string;
  hour: number;
  bookings: BookingWithRelations[];
};

export interface AvailableSlot {
  date: string;
  slots: {
    start: string;
    end: string;
    available: boolean;
    cleanerIds?: string[];
  }[];
}

// ============================================
// Webhook & API Types
// ============================================

export interface WebhookEvent {
  id: string;
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  lastUsedAt?: Date;
  totalRequests: number;
  expiresAt?: Date;
}

// ============================================
// Audit Log Types
// ============================================

export interface AuditLogEntry {
  id: string;
  companyId: string;
  userId?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ============================================
// Notification Types
// ============================================

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: Date;
}

// ============================================
// Search Types
// ============================================

export interface SearchResult {
  type: 'client' | 'booking' | 'invoice' | 'team_member';
  id: string;
  title: string;
  subtitle?: string;
  link: string;
}

export interface GlobalSearchResults {
  clients: SearchResult[];
  bookings: SearchResult[];
  invoices: SearchResult[];
  teamMembers: SearchResult[];
}

// ============================================
// Booking Conflict Type
// ============================================

export type BookingConflict = {
  bookingId: string;
  overlaps: string[];
};
