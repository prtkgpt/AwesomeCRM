import { z } from 'zod';

// ============================================
// USER VALIDATIONS
// ============================================

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  businessName: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ============================================
// CLIENT VALIDATIONS
// ============================================

export const addressSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(2),
  zip: z.string().min(5, 'ZIP code is required'),
  parkingInfo: z.string().optional(),
  gateCode: z.string().optional(),
  petInfo: z.string().optional(),
  preferences: z.string().optional(),
  // Google Maps Verification
  googlePlaceId: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  isVerified: z.boolean().optional(),
  formattedAddress: z.string().optional(),
  // Property Details
  propertyType: z.string().optional(),
  squareFootage: z.number().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  floors: z.number().optional(),
  yearBuilt: z.number().optional(),
});

export const createClientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  addresses: z.array(addressSchema).min(1, 'At least one address is required'),
  // Insurance & Helper Bee's Integration
  hasInsurance: z.boolean().optional(),
  helperBeesReferralId: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePaymentAmount: z.number().optional(),
  standardCopayAmount: z.number().optional(),
  hasDiscountedCopay: z.boolean().optional(),
  copayDiscountAmount: z.number().optional(),
  copayNotes: z.string().optional(),
});

export const updateClientSchema = z.object({
  name: z.string().min(1, 'Client name is required').optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

// ============================================
// BOOKING VALIDATIONS
// ============================================

export const createBookingSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  addressId: z.string().min(1, 'Address is required'),
  scheduledDate: z.string().or(z.date()).transform((val) => new Date(val)),
  duration: z.number().min(15, 'Duration must be at least 15 minutes'),
  serviceType: z.enum(['STANDARD', 'DEEP', 'MOVE_OUT']).default('STANDARD'),
  price: z.number().min(0, 'Price must be positive'),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  assignedTo: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.enum(['NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']).default('NONE'),
  recurrenceEndDate: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
  // Insurance payment fields
  hasInsuranceCoverage: z.boolean().optional(),
  insuranceAmount: z.number().optional(),
  copayAmount: z.number().optional(),
  copayDiscountApplied: z.number().optional(),
  finalCopayAmount: z.number().optional(),
});

export const updateBookingSchema = z.object({
  clientId: z.string().optional(),
  addressId: z.string().optional(),
  scheduledDate: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
  duration: z.number().min(15).optional(),
  serviceType: z.enum(['STANDARD', 'DEEP', 'MOVE_OUT']).optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  price: z.number().min(0).optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  assignedTo: z.string().optional().nullable(),
  isPaid: z.boolean().optional(),
  paymentMethod: z.string().optional(),
});

// ============================================
// PAYMENT VALIDATIONS
// ============================================

export const markPaidSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  paymentMethod: z.enum(['cash', 'check', 'zelle', 'card']),
  paidAt: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
});

// ============================================
// MESSAGE VALIDATIONS
// ============================================

export const sendMessageSchema = z.object({
  to: z.string().min(10, 'Valid phone number is required'),
  body: z.string().min(1, 'Message body is required'),
  bookingId: z.string().optional(),
  type: z.enum(['CONFIRMATION', 'REMINDER', 'ON_MY_WAY', 'THANK_YOU', 'PAYMENT_REQUEST', 'CUSTOM']).default('CUSTOM'),
});

export const updateMessageTemplateSchema = z.object({
  template: z.string().min(1, 'Template is required'),
  name: z.string().min(1, 'Template name is required').optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type MarkPaidInput = z.infer<typeof markPaidSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type UpdateMessageTemplateInput = z.infer<typeof updateMessageTemplateSchema>;
