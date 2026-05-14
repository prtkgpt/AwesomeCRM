import { prisma } from './prisma';

export async function logSystemEvent(params: {
  type: string;       // cron_success, cron_failure, api_error, stripe_error, twilio_error
  source: string;     // cron/send-reminders, api/payments, etc.
  status: string;     // success, error, warning
  message: string;
  metadata?: any;
  companyId?: string;
  companyName?: string;
}) {
  try {
    await prisma.systemEvent.create({ data: params });
  } catch (e) {
    console.error('Failed to write system event:', e);
  }
}
