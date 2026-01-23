import { prisma } from './prisma';

// AuditAction type - matches Prisma schema enum
// Note: This will be replaced by Prisma generated type after migration runs
export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'PASSWORD_CHANGED'
  | 'CLIENT_CREATED'
  | 'CLIENT_UPDATED'
  | 'CLIENT_DELETED'
  | 'BOOKING_CREATED'
  | 'BOOKING_UPDATED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_COMPLETED'
  | 'BOOKING_APPROVED'
  | 'TEAM_MEMBER_ADDED'
  | 'TEAM_MEMBER_UPDATED'
  | 'TEAM_MEMBER_REMOVED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'INVOICE_CREATED'
  | 'INVOICE_SENT'
  | 'MESSAGE_SENT'
  | 'EMAIL_SENT'
  | 'SETTINGS_UPDATED'
  | 'COMPANY_UPDATED'
  | 'ESTIMATE_CREATED'
  | 'ESTIMATE_SENT'
  | 'ESTIMATE_ACCEPTED'
  | 'REVIEW_RECEIVED'
  | 'TIME_OFF_REQUESTED'
  | 'TIME_OFF_APPROVED'
  | 'TIME_OFF_DENIED';

// Types for audit logging
export interface AuditLogParams {
  companyId: string;
  userId?: string | null;
  action: AuditAction;
  description: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an activity to the audit log
 * @param params - Audit log parameters
 */
export async function logActivity(params: AuditLogParams): Promise<void> {
  try {
    // Use type assertion until Prisma client is regenerated with AuditLog model
    const db = prisma as any;
    if (db.auditLog) {
      await db.auditLog.create({
        data: {
          companyId: params.companyId,
          userId: params.userId || null,
          action: params.action,
          description: params.description,
          entityType: params.entityType || null,
          entityId: params.entityId || null,
          metadata: params.metadata || null,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    }
  } catch (error) {
    // Log error but don't throw - audit logging should never break main operations
    console.error('Failed to log activity:', error);
  }
}

/**
 * Helper function to get user name for audit descriptions
 */
export function getUserDisplayName(user: { name?: string | null; email: string }): string {
  return user.name || user.email;
}

/**
 * Helper function to truncate IDs for display
 */
export function getShortId(id: string): string {
  return id.slice(0, 8);
}

// Convenience functions for common audit actions

export async function logClientCreated(
  companyId: string,
  userId: string,
  userName: string,
  clientId: string,
  clientName: string
) {
  await logActivity({
    companyId,
    userId,
    action: 'CLIENT_CREATED',
    description: `${userName} created client "${clientName}"`,
    entityType: 'Client',
    entityId: clientId,
    metadata: { clientName },
  });
}

export async function logClientUpdated(
  companyId: string,
  userId: string,
  userName: string,
  clientId: string,
  clientName: string,
  changes?: Record<string, any>
) {
  await logActivity({
    companyId,
    userId,
    action: 'CLIENT_UPDATED',
    description: `${userName} updated client "${clientName}"`,
    entityType: 'Client',
    entityId: clientId,
    metadata: { clientName, changes },
  });
}

export async function logClientDeleted(
  companyId: string,
  userId: string,
  userName: string,
  clientId: string,
  clientName: string
) {
  await logActivity({
    companyId,
    userId,
    action: 'CLIENT_DELETED',
    description: `${userName} deleted client "${clientName}"`,
    entityType: 'Client',
    entityId: clientId,
    metadata: { clientName },
  });
}

export async function logBookingCreated(
  companyId: string,
  userId: string,
  userName: string,
  bookingId: string,
  clientName: string,
  scheduledDate: Date
) {
  await logActivity({
    companyId,
    userId,
    action: 'BOOKING_CREATED',
    description: `${userName} created booking for "${clientName}"`,
    entityType: 'Booking',
    entityId: bookingId,
    metadata: { clientName, scheduledDate: scheduledDate.toISOString() },
  });
}

export async function logBookingUpdated(
  companyId: string,
  userId: string,
  userName: string,
  bookingId: string,
  clientName: string,
  changes?: Record<string, any>
) {
  await logActivity({
    companyId,
    userId,
    action: 'BOOKING_UPDATED',
    description: `${userName} updated booking for "${clientName}"`,
    entityType: 'Booking',
    entityId: bookingId,
    metadata: { clientName, changes },
  });
}

export async function logBookingCancelled(
  companyId: string,
  userId: string,
  userName: string,
  bookingId: string,
  clientName: string
) {
  await logActivity({
    companyId,
    userId,
    action: 'BOOKING_CANCELLED',
    description: `${userName} cancelled booking for "${clientName}"`,
    entityType: 'Booking',
    entityId: bookingId,
    metadata: { clientName },
  });
}

export async function logBookingCompleted(
  companyId: string,
  userId: string,
  userName: string,
  bookingId: string,
  clientName: string
) {
  await logActivity({
    companyId,
    userId,
    action: 'BOOKING_COMPLETED',
    description: `${userName} marked booking for "${clientName}" as completed`,
    entityType: 'Booking',
    entityId: bookingId,
    metadata: { clientName },
  });
}

export async function logBookingApproved(
  companyId: string,
  userId: string,
  userName: string,
  bookingId: string,
  clientName: string
) {
  await logActivity({
    companyId,
    userId,
    action: 'BOOKING_APPROVED',
    description: `${userName} approved booking for "${clientName}"`,
    entityType: 'Booking',
    entityId: bookingId,
    metadata: { clientName },
  });
}

export async function logPaymentReceived(
  companyId: string,
  userId: string | null,
  userName: string,
  bookingId: string,
  clientName: string,
  amount: number,
  method: string
) {
  await logActivity({
    companyId,
    userId,
    action: 'PAYMENT_RECEIVED',
    description: `Payment of $${amount.toFixed(2)} received from "${clientName}" via ${method}`,
    entityType: 'Booking',
    entityId: bookingId,
    metadata: { clientName, amount, method },
  });
}

export async function logMessageSent(
  companyId: string,
  userId: string,
  userName: string,
  messageType: string,
  recipientPhone: string,
  recipientName?: string
) {
  const recipient = recipientName || recipientPhone;
  await logActivity({
    companyId,
    userId,
    action: 'MESSAGE_SENT',
    description: `${userName} sent ${messageType.toLowerCase().replace('_', ' ')} to ${recipient}`,
    entityType: 'Message',
    metadata: { messageType, recipientPhone, recipientName },
  });
}

export async function logTeamMemberAdded(
  companyId: string,
  userId: string,
  userName: string,
  teamMemberId: string,
  memberName: string,
  role: string
) {
  await logActivity({
    companyId,
    userId,
    action: 'TEAM_MEMBER_ADDED',
    description: `${userName} added "${memberName}" as ${role}`,
    entityType: 'TeamMember',
    entityId: teamMemberId,
    metadata: { memberName, role },
  });
}

export async function logSettingsUpdated(
  companyId: string,
  userId: string,
  userName: string,
  settingsArea: string,
  changes?: Record<string, any>
) {
  await logActivity({
    companyId,
    userId,
    action: 'SETTINGS_UPDATED',
    description: `${userName} updated ${settingsArea} settings`,
    entityType: 'Company',
    entityId: companyId,
    metadata: { settingsArea, changes },
  });
}

export async function logLogin(
  companyId: string,
  userId: string,
  userName: string,
  ipAddress?: string,
  userAgent?: string
) {
  await logActivity({
    companyId,
    userId,
    action: 'LOGIN',
    description: `${userName} logged in`,
    ipAddress,
    userAgent,
  });
}

export async function logLoginFailed(
  companyId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string
) {
  await logActivity({
    companyId,
    userId: null,
    action: 'LOGIN_FAILED',
    description: `Failed login attempt for ${email}`,
    metadata: { email },
    ipAddress,
    userAgent,
  });
}
