// ============================================
// CleanDayCRM - Validation Schemas (Zod)
// ============================================

import { z } from 'zod';

// ============================================
// COMMON VALIDATORS
// ============================================

const phoneRegex = /^[\d\s\-\+\(\)]+$/;
const zipRegex = /^\d{5}(-\d{4})?$/;

export const phoneSchema = z.string()
  .regex(phoneRegex, 'Invalid phone number format')
  .optional()
  .or(z.literal(''));

export const emailSchema = z.string()
  .email('Invalid email address')
  .transform(val => val.toLowerCase());

export const optionalEmailSchema = z.string()
  .email('Invalid email address')
  .transform(val => val.toLowerCase())
  .optional()
  .or(z.literal(''));

// ============================================
// USER & AUTH VALIDATIONS
// ============================================

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  phone: phoneSchema,
  companyName: z.string().min(1, 'Company name is required'),
  businessTypes: z.array(z.enum(['RESIDENTIAL', 'COMMERCIAL'])).default(['RESIDENTIAL']),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  phone: phoneSchema,
  avatar: z.string().url().optional().or(z.literal('')),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
});

// ============================================
// CLIENT VALIDATIONS
// ============================================

export const addressSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  isPrimary: z.boolean().default(false),
  street: z.string().min(1, 'Street address is required'),
  unit: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(2),
  zip: z.string().regex(zipRegex, 'Invalid ZIP code'),
  country: z.string().default('US'),

  // Google Maps
  googlePlaceId: z.string().optional(),
  formattedAddress: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  isVerified: z.boolean().default(false),

  // Property Details
  propertyType: z.enum(['HOUSE', 'CONDO', 'APARTMENT', 'TOWNHOUSE', 'OFFICE', 'AIRBNB']).optional(),
  squareFootage: z.number().min(0).optional(),
  bedrooms: z.number().min(0).max(20).optional(),
  bathrooms: z.number().min(0).max(20).optional(),
  floors: z.number().min(1).max(10).optional(),
  yearBuilt: z.number().min(1800).max(new Date().getFullYear() + 5).optional(),
  hasBasement: z.boolean().default(false),
  hasGarage: z.boolean().default(false),
  hasYard: z.boolean().default(false),
  hasPool: z.boolean().default(false),

  // Access
  parkingInfo: z.string().optional(),
  gateCode: z.string().optional(),
  alarmCode: z.string().optional(),
  lockboxCode: z.string().optional(),
  keyLocation: z.string().optional(),
  entryInstructions: z.string().optional(),

  // Pets
  hasPets: z.boolean().default(false),
  petDetails: z.string().optional(),
  petInstructions: z.string().optional(),

  // Notes
  cleanerNotes: z.string().optional(),
  specialInstructions: z.string().optional(),
});

export const clientPreferenceSchema = z.object({
  cleaningSequence: z.string().optional(),
  priorityAreas: z.string().optional(),
  areasToAvoid: z.string().optional(),
  productAllergies: z.string().optional(),
  preferredProducts: z.string().optional(),
  customerProvidesProducts: z.boolean().default(false),
  avoidScents: z.boolean().default(false),
  scentPreferences: z.string().optional(),
  ecoFriendlyOnly: z.boolean().default(false),
  petHandlingInstructions: z.string().optional(),
  petFeedingRequired: z.boolean().default(false),
  petFeedingInstructions: z.string().optional(),
  petsSecuredDuring: z.boolean().default(false),
  petSecuringInstructions: z.string().optional(),
  preferredCleaner: z.string().optional(),
  languagePreference: z.string().optional(),
  communicationNotes: z.string().optional(),
  temperaturePreference: z.string().optional(),
  musicPreference: z.string().optional(),
  doNotDisturb: z.string().optional(),
  plantWatering: z.boolean().default(false),
  plantInstructions: z.string().optional(),
  mailCollection: z.boolean().default(false),
  trashTakeout: z.boolean().default(false),
  otherTasks: z.string().optional(),
});

export const createClientSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  email: optionalEmailSchema,
  phone: phoneSchema,
  alternatePhone: phoneSchema,
  preferredContactMethod: z.enum(['EMAIL', 'SMS', 'PHONE']).default('EMAIL'),

  // Classification
  tags: z.array(z.string()).default([]),
  source: z.enum(['WEBSITE', 'REFERRAL', 'GOOGLE', 'YELP', 'SOCIAL', 'OTHER']).optional(),
  notes: z.string().optional(),

  // Billing
  billingEmail: optionalEmailSchema,
  autoChargeEnabled: z.boolean().default(false),

  // Insurance
  hasInsurance: z.boolean().default(false),
  insuranceProvider: z.string().optional(),
  insuranceMemberId: z.string().optional(),
  insurancePaymentAmount: z.number().min(0).optional(),
  standardCopay: z.number().min(0).optional(),
  discountedCopay: z.number().min(0).optional(),
  copayNotes: z.string().optional(),

  // Dates
  birthday: z.string().or(z.date()).transform(val => val ? new Date(val) : undefined).optional(),
  anniversary: z.string().or(z.date()).transform(val => val ? new Date(val) : undefined).optional(),
  anniversaryType: z.enum(['FIRST_BOOKING', 'WEDDING', 'CUSTOM']).optional(),

  // Communication
  enableBirthdayGreeting: z.boolean().default(true),
  enableAnniversaryGreeting: z.boolean().default(true),
  enablePromotionalEmails: z.boolean().default(true),

  // Status
  isVip: z.boolean().default(false),

  // Address
  addresses: z.array(addressSchema).min(1, 'At least one address is required'),

  // Preferences
  preferences: clientPreferenceSchema.optional(),

  // Referral
  referralCode: z.string().optional(),
});

export const updateClientSchema = createClientSchema.partial().omit({ addresses: true });

// ============================================
// BOOKING VALIDATIONS
// ============================================

export const bookingAddonSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  quantity: z.number().min(1).default(1),
});

export const createBookingSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  addressId: z.string().min(1, 'Address is required'),
  serviceId: z.string().optional(),
  serviceType: z.enum(['STANDARD', 'DEEP', 'MOVE_IN', 'MOVE_OUT', 'POST_CONSTRUCTION', 'POST_PARTY', 'OFFICE', 'AIRBNB', 'CUSTOM']).default('STANDARD'),

  // Scheduling
  scheduledDate: z.string().or(z.date()).transform(val => new Date(val)),
  scheduledEndDate: z.string().or(z.date()).transform(val => new Date(val)).optional(),
  duration: z.number().min(30, 'Duration must be at least 30 minutes'),
  timeSlot: z.enum(['MORNING', 'AFTERNOON', 'EVENING']).optional(),

  // Assignment
  assignedCleanerId: z.string().optional(),
  locationId: z.string().optional(),

  // Pricing
  basePrice: z.number().min(0, 'Price must be positive'),
  addons: z.array(bookingAddonSchema).optional(),
  discountCode: z.string().optional(),
  creditsApplied: z.number().min(0).default(0),

  // Insurance
  hasInsurance: z.boolean().default(false),
  insuranceAmount: z.number().min(0).default(0),
  copayAmount: z.number().min(0).default(0),

  // Notes
  customerNotes: z.string().optional(),
  internalNotes: z.string().optional(),
  cleanerNotes: z.string().optional(),

  // Recurrence
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.enum(['NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM']).default('NONE'),
  recurrenceEndDate: z.string().or(z.date()).transform(val => new Date(val)).optional(),
});

export const updateBookingSchema = z.object({
  clientId: z.string().optional(),
  addressId: z.string().optional(),
  serviceId: z.string().optional().nullable(),
  serviceType: z.enum(['STANDARD', 'DEEP', 'MOVE_IN', 'MOVE_OUT', 'POST_CONSTRUCTION', 'POST_PARTY', 'OFFICE', 'AIRBNB', 'CUSTOM']).optional(),

  // Scheduling
  scheduledDate: z.string().or(z.date()).transform(val => new Date(val)).optional(),
  duration: z.number().min(30).optional(),
  timeSlot: z.enum(['MORNING', 'AFTERNOON', 'EVENING']).optional().nullable(),

  // Assignment
  assignedCleanerId: z.string().optional().nullable(),

  // Status
  status: z.enum(['PENDING', 'CONFIRMED', 'CLEANER_EN_ROUTE', 'IN_PROGRESS', 'CLEANER_COMPLETED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED']).optional(),

  // Pricing
  basePrice: z.number().min(0).optional(),
  addons: z.array(bookingAddonSchema).optional(),
  discountAmount: z.number().min(0).optional(),
  tipAmount: z.number().min(0).optional(),

  // Payment
  isPaid: z.boolean().optional(),
  paymentMethod: z.enum(['CARD', 'CASH', 'CHECK', 'ZELLE', 'VENMO', 'CASHAPP', 'BANK_TRANSFER', 'GIFT_CARD', 'CREDITS', 'INSURANCE']).optional(),

  // Notes
  customerNotes: z.string().optional(),
  internalNotes: z.string().optional(),
  cleanerNotes: z.string().optional(),

  // Recurrence
  isRecurring: z.boolean().optional(),
  recurrenceFrequency: z.enum(['NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM']).optional(),
  isPaused: z.boolean().optional(),
  pausedUntil: z.string().or(z.date()).transform(val => new Date(val)).optional().nullable(),
});

// ============================================
// PAYMENT VALIDATIONS
// ============================================

export const markPaidSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  amount: z.number().min(0).optional(),
  paymentMethod: z.enum(['CARD', 'CASH', 'CHECK', 'ZELLE', 'VENMO', 'CASHAPP', 'BANK_TRANSFER', 'GIFT_CARD', 'CREDITS', 'INSURANCE']),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
});

export const createPaymentSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  bookingId: z.string().optional(),
  invoiceId: z.string().optional(),
  amount: z.number().min(0.01, 'Amount must be at least $0.01'),
  method: z.enum(['CARD', 'CASH', 'CHECK', 'ZELLE', 'VENMO', 'CASHAPP', 'BANK_TRANSFER', 'GIFT_CARD', 'CREDITS', 'INSURANCE']),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
});

export const refundPaymentSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  amount: z.number().min(0.01, 'Refund amount must be at least $0.01'),
  reason: z.string().min(1, 'Refund reason is required'),
});

// ============================================
// INVOICE VALIDATIONS
// ============================================

export const invoiceLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(1).default(1),
  unitPrice: z.number().min(0),
  taxable: z.boolean().default(false),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  bookingId: z.string().optional(),
  dueDate: z.string().or(z.date()).transform(val => new Date(val)),
  lineItems: z.array(invoiceLineItemSchema).min(1, 'At least one line item is required'),
  notes: z.string().optional(),
  terms: z.string().optional(),
  footerText: z.string().optional(),
});

export const updateInvoiceSchema = z.object({
  dueDate: z.string().or(z.date()).transform(val => new Date(val)).optional(),
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED', 'REFUNDED']).optional(),
  lineItems: z.array(invoiceLineItemSchema).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

// ============================================
// TEAM MEMBER VALIDATIONS
// ============================================

export const dayAvailabilitySchema = z.object({
  enabled: z.boolean().default(false),
  start: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  end: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
});

export const availabilitySchema = z.object({
  monday: dayAvailabilitySchema,
  tuesday: dayAvailabilitySchema,
  wednesday: dayAvailabilitySchema,
  thursday: dayAvailabilitySchema,
  friday: dayAvailabilitySchema,
  saturday: dayAvailabilitySchema,
  sunday: dayAvailabilitySchema,
});

export const createTeamMemberSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  phone: phoneSchema,
  role: z.enum(['ADMIN', 'CLEANER']),

  // Employment
  employeeId: z.string().optional(),
  hourlyRate: z.number().min(0).optional(),
  salary: z.number().min(0).optional(),
  payType: z.enum(['HOURLY', 'SALARY', 'CONTRACT']).default('HOURLY'),
  hireDate: z.string().or(z.date()).transform(val => new Date(val)).optional(),

  // Address
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),

  // Work Profile
  specialties: z.array(z.string()).default([]),
  serviceAreas: z.array(z.string()).default([]),
  serviceTypes: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  yearsExperience: z.number().min(0).optional(),
  speed: z.enum(['FAST', 'NORMAL', 'THOROUGH']).optional(),

  // Scheduling
  availability: availabilitySchema.optional(),
  preferredHours: z.number().min(0).max(60).optional(),
  maxJobsPerDay: z.number().min(1).max(10).optional(),

  // Location
  locationId: z.string().optional(),

  // Emergency
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: phoneSchema,
});

export const updateTeamMemberSchema = createTeamMemberSchema.partial().omit({ email: true, role: true });

// ============================================
// MESSAGE VALIDATIONS
// ============================================

export const sendMessageSchema = z.object({
  to: z.string().min(10, 'Valid phone number or email is required'),
  body: z.string().min(1, 'Message body is required'),
  subject: z.string().optional(), // For email
  channel: z.enum(['SMS', 'EMAIL']),
  type: z.enum(['CONFIRMATION', 'REMINDER', 'ON_MY_WAY', 'ARRIVED', 'COMPLETED', 'THANK_YOU', 'PAYMENT_REQUEST', 'REVIEW_REQUEST', 'BIRTHDAY', 'ANNIVERSARY', 'PROMOTIONAL', 'CUSTOM']).default('CUSTOM'),
  bookingId: z.string().optional(),
});

export const messageTemplateSchema = z.object({
  type: z.enum(['CONFIRMATION', 'REMINDER', 'ON_MY_WAY', 'ARRIVED', 'COMPLETED', 'THANK_YOU', 'PAYMENT_REQUEST', 'REVIEW_REQUEST', 'BIRTHDAY', 'ANNIVERSARY', 'PROMOTIONAL', 'CUSTOM']),
  channel: z.enum(['SMS', 'EMAIL']),
  name: z.string().min(1, 'Template name is required'),
  subject: z.string().optional(),
  body: z.string().min(1, 'Template body is required'),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// ============================================
// SERVICE & PRICING VALIDATIONS
// ============================================

export const createServiceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  description: z.string().optional(),
  type: z.enum(['STANDARD', 'DEEP', 'MOVE_IN', 'MOVE_OUT', 'POST_CONSTRUCTION', 'POST_PARTY', 'OFFICE', 'AIRBNB', 'CUSTOM']),
  basePrice: z.number().min(0, 'Base price must be positive'),
  baseDuration: z.number().min(15, 'Duration must be at least 15 minutes'),
  priceType: z.enum(['FLAT', 'HOURLY', 'SQFT']).default('FLAT'),
  icon: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
  sortOrder: z.number().default(0),
  includedTasks: z.array(z.string()).optional(),
  excludedTasks: z.array(z.string()).optional(),
  weeklyDiscount: z.number().min(0).max(100).default(0),
  biweeklyDiscount: z.number().min(0).max(100).default(0),
  monthlyDiscount: z.number().min(0).max(100).default(0),
});

export const pricingRuleSchema = z.object({
  serviceId: z.string().optional(),
  type: z.enum(['BEDROOM', 'BATHROOM', 'SQFT', 'ADDON', 'FREQUENCY', 'TIME_OF_DAY', 'CUSTOM']),
  name: z.string().min(1, 'Rule name is required'),
  description: z.string().optional(),
  price: z.number(),
  duration: z.number().default(0),
  priceType: z.enum(['FLAT', 'PERCENT', 'PER_UNIT']).default('FLAT'),
  quantity: z.number().optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  frequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']).optional(),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']).optional(),
  timeSlot: z.enum(['MORNING', 'AFTERNOON', 'EVENING']).optional(),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

// ============================================
// GIFT CARD & PROMOTION VALIDATIONS
// ============================================

export const createGiftCardSchema = z.object({
  initialAmount: z.number().min(5, 'Minimum gift card amount is $5'),
  recipientName: z.string().optional(),
  recipientEmail: optionalEmailSchema,
  personalMessage: z.string().max(500).optional(),
  purchaserName: z.string().optional(),
  purchaserEmail: optionalEmailSchema,
  expiresAt: z.string().or(z.date()).transform(val => new Date(val)).optional(),
});

export const createPromotionSchema = z.object({
  code: z.string().min(3, 'Code must be at least 3 characters').max(20).toUpperCase(),
  name: z.string().min(1, 'Promotion name is required'),
  description: z.string().optional(),
  discountType: z.enum(['PERCENT', 'FIXED', 'FREE_ADDON']),
  discountValue: z.number().min(0),
  maxDiscount: z.number().min(0).optional(),
  minOrderAmount: z.number().min(0).optional(),
  maxUsageCount: z.number().min(1).optional(),
  maxUsagePerUser: z.number().min(1).optional(),
  serviceTypes: z.array(z.string()).default([]),
  newCustomersOnly: z.boolean().default(false),
  firstBookingOnly: z.boolean().default(false),
  startsAt: z.string().or(z.date()).transform(val => new Date(val)),
  expiresAt: z.string().or(z.date()).transform(val => new Date(val)).optional(),
  isActive: z.boolean().default(true),
});

// ============================================
// INVENTORY VALIDATIONS
// ============================================

export const createInventoryItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  sku: z.string().optional(),
  description: z.string().optional(),
  category: z.enum(['SUPPLIES', 'EQUIPMENT', 'UNIFORMS', 'OTHER']).optional(),
  quantity: z.number().min(0).default(0),
  unit: z.string().default('each'),
  reorderLevel: z.number().min(0).optional(),
  reorderQuantity: z.number().min(0).optional(),
  unitCost: z.number().min(0).optional(),
  vendorName: z.string().optional(),
  vendorSku: z.string().optional(),
  vendorUrl: z.string().url().optional().or(z.literal('')),
  locationId: z.string().optional(),
});

export const inventoryMovementSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  type: z.enum(['PURCHASE', 'USAGE', 'RESTOCK', 'ADJUSTMENT', 'TRANSFER', 'WASTE']),
  quantity: z.number(),
  unitCost: z.number().optional(),
  notes: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
});

// ============================================
// QUALITY CHECK VALIDATIONS
// ============================================

export const createQualityCheckSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  cleanerId: z.string().min(1, 'Cleaner ID is required'),
  scheduledAt: z.string().or(z.date()).transform(val => new Date(val)).optional(),
});

export const updateQualityCheckSchema = z.object({
  status: z.enum(['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'PASSED', 'FAILED', 'NEEDS_ATTENTION']).optional(),
  overallScore: z.number().min(1).max(5).optional(),
  thoroughnessScore: z.number().min(1).max(5).optional(),
  attentionToDetailScore: z.number().min(1).max(5).optional(),
  timeManagementScore: z.number().min(1).max(5).optional(),
  checklistResults: z.record(z.record(z.object({
    passed: z.boolean(),
    notes: z.string().optional(),
    photoUrl: z.string().optional(),
  }))).optional(),
  issues: z.array(z.object({
    area: z.string(),
    description: z.string(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    photoUrl: z.string().optional(),
  })).optional(),
  notes: z.string().optional(),
  cleanerFeedback: z.string().optional(),
  requiresFollowUp: z.boolean().optional(),
  followUpNotes: z.string().optional(),
});

// ============================================
// COMPANY SETTINGS VALIDATIONS
// ============================================

export const updateCompanySettingsSchema = z.object({
  name: z.string().min(1).optional(),
  email: optionalEmailSchema,
  phone: phoneSchema,
  website: z.string().url().optional().or(z.literal('')),

  // Address
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),

  // Branding
  logo: z.string().url().optional().or(z.literal('')),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),

  // Regional
  timezone: z.string().optional(),
  currency: z.string().optional(),
  dateFormat: z.string().optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
  language: z.string().optional(),

  // Business
  businessTypes: z.array(z.string()).optional(),
  operatingHours: z.record(z.object({
    enabled: z.boolean(),
    start: z.string(),
    end: z.string(),
  })).optional(),

  // Features
  features: z.record(z.boolean()).optional(),

  // Pricing
  baseHourlyRate: z.number().min(0).optional(),
  minimumBookingPrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  cancellationFeePercent: z.number().min(0).max(100).optional(),
  cancellationWindow: z.number().min(0).optional(),

  // Booking
  onlineBookingEnabled: z.boolean().optional(),
  minimumLeadTime: z.number().min(0).optional(),
  maximumLeadTime: z.number().min(1).optional(),
  requireApproval: z.boolean().optional(),
  requireDeposit: z.boolean().optional(),
  depositPercent: z.number().min(0).max(100).optional(),
  allowInstantBooking: z.boolean().optional(),

  // Reminders
  customerReminderEnabled: z.boolean().optional(),
  customerReminderHours: z.number().min(1).optional(),
  cleanerReminderEnabled: z.boolean().optional(),
  cleanerReminderHours: z.number().min(1).optional(),
  morningReminderEnabled: z.boolean().optional(),
  morningReminderTime: z.string().optional(),

  // Reviews
  autoSendReviewRequest: z.boolean().optional(),
  reviewRequestDelay: z.number().min(0).optional(),

  // Referral
  referralEnabled: z.boolean().optional(),
  referralReferrerReward: z.number().min(0).optional(),
  referralRefereeReward: z.number().min(0).optional(),
  referralCreditExpiry: z.number().min(1).optional(),

  // Loyalty
  loyaltyEnabled: z.boolean().optional(),
  loyaltyPointsPerDollar: z.number().min(0).optional(),
  loyaltyPointsValue: z.number().min(0).optional(),

  // QA
  qaEnabled: z.boolean().optional(),
  qaFrequencyPercent: z.number().min(0).max(100).optional(),

  // Expenses
  insuranceCost: z.number().min(0).optional(),
  bondCost: z.number().min(0).optional(),
  workersCompCost: z.number().min(0).optional(),
  suppliesCost: z.number().min(0).optional(),
  gasReimbursementRate: z.number().min(0).optional(),
  adminSalary: z.number().min(0).optional(),
  ownerSalary: z.number().min(0).optional(),
  otherExpenses: z.number().min(0).optional(),
});

// ============================================
// CHECKLIST VALIDATIONS
// ============================================

export const checklistTaskSchema = z.object({
  id: z.string(),
  task: z.string().min(1),
  required: z.boolean().default(false),
  completed: z.boolean().default(false),
  completedAt: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
});

export const checklistTemplateSchema = z.object({
  serviceId: z.string().optional(),
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  items: z.record(z.array(checklistTaskSchema)),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateJobChecklistSchema = z.object({
  items: z.record(z.array(checklistTaskSchema)),
});

// ============================================
// REVIEW VALIDATIONS
// ============================================

export const createReviewSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  overallRating: z.number().min(1).max(5),
  qualityRating: z.number().min(1).max(5).optional(),
  punctualityRating: z.number().min(1).max(5).optional(),
  communicationRating: z.number().min(1).max(5).optional(),
  valueRating: z.number().min(1).max(5).optional(),
  title: z.string().optional(),
  comment: z.string().optional(),
});

export const respondToReviewSchema = z.object({
  reviewId: z.string().min(1, 'Review ID is required'),
  responseText: z.string().min(1, 'Response is required'),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type ClientPreferenceInput = z.infer<typeof clientPreferenceSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type BookingAddonInput = z.infer<typeof bookingAddonSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type MarkPaidInput = z.infer<typeof markPaidSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type DayAvailabilityInput = z.infer<typeof dayAvailabilitySchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type MessageTemplateInput = z.infer<typeof messageTemplateSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type PricingRuleInput = z.infer<typeof pricingRuleSchema>;
export type CreateGiftCardInput = z.infer<typeof createGiftCardSchema>;
export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type InventoryMovementInput = z.infer<typeof inventoryMovementSchema>;
export type CreateQualityCheckInput = z.infer<typeof createQualityCheckSchema>;
export type UpdateQualityCheckInput = z.infer<typeof updateQualityCheckSchema>;
export type UpdateCompanySettingsInput = z.infer<typeof updateCompanySettingsSchema>;
export type ChecklistTaskInput = z.infer<typeof checklistTaskSchema>;
export type ChecklistTemplateInput = z.infer<typeof checklistTemplateSchema>;
export type UpdateJobChecklistInput = z.infer<typeof updateJobChecklistSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type RespondToReviewInput = z.infer<typeof respondToReviewSchema>;
