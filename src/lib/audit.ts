import { prisma } from './prisma';

export async function logAudit(params: {
  action: string;      // CREATE, UPDATE, DELETE, LOGIN, EXPORT
  entity: string;      // Company, Client, Booking, User, Invoice
  entityId?: string;
  description: string;
  metadata?: any;
  userId?: string;
  userName?: string;
  userEmail?: string;
  companyId?: string;
  companyName?: string;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({ data: params });
  } catch (e) {
    console.error('Failed to write audit log:', e);
  }
}
