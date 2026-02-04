// SMS utility using Twilio
// Install: npm install twilio
import { formatDate, formatTime } from '@/lib/utils';

interface SendSMSParams {
  to: string;
  message: string;
}

export async function sendSMS({ to, message }: SendSMSParams) {
  try {
    // If using Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      const twilio = require('twilio');
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to,
      });

      return { success: true, data: result };
    }

    // Development mode: Just log the SMS
    if (process.env.NODE_ENV === 'development') {
      console.log('📱 SMS (DEV MODE):');
      console.log('To:', to);
      console.log('Message:', message);
      return { success: true, data: { dev: true } };
    }

    throw new Error('No SMS service configured');
  } catch (error) {
    console.error('Send SMS error:', error);
    throw error;
  }
}

// SMS templates
export function getEstimateSMSMessage(data: {
  customerName: string;
  companyName: string;
  price: number;
  estimateUrl: string;
}) {
  return `Hi ${data.customerName}! ${data.companyName} has sent you a cleaning estimate for $${data.price.toFixed(2)}. View and book your appointment: ${data.estimateUrl}`;
}

export function getBookingConfirmationSMSMessage(data: {
  customerName: string;
  companyName: string;
  scheduledDate: string;
  address: string;
}) {
  const dateStr = formatDate(data.scheduledDate, 'EEEE, MMMM d');
  const timeStr = formatTime(data.scheduledDate);

  return `Hi ${data.customerName}! Your cleaning with ${data.companyName} is confirmed for ${dateStr} at ${timeStr}. Location: ${data.address}. We look forward to serving you!`;
}

export function getEstimateReminderSMSMessage(data: {
  customerName: string;
  companyName: string;
  estimateUrl: string;
}) {
  return `Hi ${data.customerName}, this is a friendly reminder from ${data.companyName}. Your estimate is still available to review and book: ${data.estimateUrl}`;
}
