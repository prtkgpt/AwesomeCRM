// Email utility using Resend (you can also use Nodemailer)
// Install: npm install resend

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  type?: 'estimate' | 'booking' | 'notification' | 'general';
  apiKey?: string; // Optional company-specific API key
}

// Get the appropriate "from" address based on email type
function getFromAddress(type?: string, customFrom?: string): string {
  if (customFrom) return customFrom;

  // Use Resend's default domain if custom domain is not verified
  // Once you verify cleandaycrm.com in Resend, update EMAIL_DOMAIN in env vars
  const domain = process.env.EMAIL_DOMAIN || 'resend.dev';
  const useDefaultDomain = domain === 'resend.dev';

  switch (type) {
    case 'estimate':
      return process.env.EMAIL_FROM_ESTIMATES ||
             (useDefaultDomain ? 'estimates@resend.dev' : `estimates@${domain}`);
    case 'booking':
      return process.env.EMAIL_FROM_BOOKINGS ||
             (useDefaultDomain ? 'bookings@resend.dev' : `bookings@${domain}`);
    case 'notification':
      return process.env.EMAIL_FROM_NOTIFICATIONS ||
             (useDefaultDomain ? 'notifications@resend.dev' : `notifications@${domain}`);
    default:
      return process.env.EMAIL_FROM ||
             (useDefaultDomain ? 'onboarding@resend.dev' : `noreply@${domain}`);
  }
}

export async function sendEmail({ to, subject, html, from, replyTo, type, apiKey }: SendEmailParams) {
  const fromAddress = getFromAddress(type, from);
  const resendKey = apiKey || process.env.RESEND_API_KEY;

  try {
    // If using Resend
    if (resendKey) {
      const emailPayload: any = {
        from: fromAddress,
        to: [to],
        subject,
        html,
      };

      if (replyTo) {
        emailPayload.reply_to = replyTo;
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify(emailPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Include more detailed error information
        const errorDetails = data.message || JSON.stringify(data) || 'Failed to send email';
        throw new Error(`Resend API error: ${errorDetails}`);
      }

      return { success: true, data };
    }

    // Fallback: Use Nodemailer (if SMTP credentials are provided)
    if (process.env.SMTP_HOST) {
      const nodemailer = require('nodemailer');

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
      });

      return { success: true, data: info };
    }

    // Development mode: Just log the email
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Email (DEV MODE):');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('HTML:', html);
      return { success: true, data: { dev: true } };
    }

    throw new Error('No email service configured');
  } catch (error) {
    console.error('Send email error:', error);
    throw error;
  }
}

// Email templates
export function getEstimateEmailTemplate(data: {
  customerName: string;
  companyName: string;
  serviceType: string;
  scheduledDate: string;
  price: number;
  estimateUrl: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Cleaning Estimate</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #2563eb; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">${data.companyName}</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px;">Your Cleaning Estimate</p>
  </div>

  <div style="background-color: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${data.customerName},</p>

    <p style="font-size: 16px;">Thank you for your interest in our cleaning services! We've prepared a custom estimate for you.</p>

    <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h2 style="margin-top: 0; color: #2563eb; font-size: 20px;">Estimate Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Service:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.serviceType}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Scheduled Date:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${new Date(data.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0;"><strong>Estimated Price:</strong></td>
          <td style="padding: 10px 0; text-align: right; font-size: 24px; color: #2563eb; font-weight: bold;">$${data.price.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.estimateUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">View & Accept Estimate</a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      This estimate is valid for 30 days. Click the button above to view full details and book your appointment.
    </p>

    <p style="font-size: 14px; margin-top: 20px;">
      Questions? Reply to this email or contact us directly.
    </p>

    <p style="font-size: 14px; margin-top: 20px;">
      Best regards,<br>
      <strong>${data.companyName}</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; font-size: 12px; color: #6b7280;">
    <p>© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

export function getBookingConfirmationEmailTemplate(data: {
  customerName: string;
  companyName: string;
  serviceType: string;
  scheduledDate: string;
  address: string;
  price: number;
  accountCreated?: boolean;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #10b981; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">✓ Booking Confirmed!</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px;">Your cleaning is scheduled</p>
  </div>

  <div style="background-color: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${data.customerName},</p>

    <p style="font-size: 16px;">Thank you for booking with ${data.companyName}! Your payment has been processed and your appointment is confirmed.</p>

    <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h2 style="margin-top: 0; color: #10b981; font-size: 20px;">Appointment Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Service:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.serviceType}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Date & Time:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${new Date(data.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}<br>${new Date(data.scheduledDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Address:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.address}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0;"><strong>Total Paid:</strong></td>
          <td style="padding: 10px 0; text-align: right; font-size: 24px; color: #10b981; font-weight: bold;">$${data.price.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    ${data.accountCreated ? `
    <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
      <p style="margin: 0; color: #1e40af;"><strong>✓ Account Created!</strong></p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #1e40af;">
        We've created a customer portal account for you. You can log in to view your bookings, invoices, and manage future appointments.
      </p>
    </div>
    ` : ''}

    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #92400e;"><strong>What to expect:</strong></p>
      <ul style="margin: 10px 0; padding-left: 20px; color: #92400e;">
        <li>We'll send a reminder 24 hours before your appointment</li>
        <li>Our team will arrive at the scheduled time</li>
        <li>All cleaning supplies and equipment are provided</li>
      </ul>
    </div>

    <p style="font-size: 14px; margin-top: 20px;">
      Need to reschedule? Have questions? Just reply to this email or contact us directly.
    </p>

    <p style="font-size: 14px; margin-top: 20px;">
      We look forward to serving you!<br>
      <strong>${data.companyName}</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; font-size: 12px; color: #6b7280;">
    <p>© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

export function getTeamInvitationEmailTemplate(data: {
  invitedEmail: string;
  companyName: string;
  role: string;
  invitedByName: string;
  inviteLink: string;
  expiresAt: Date;
}) {
  const roleDisplay = data.role === 'ADMIN' ? 'Administrator' : 'Cleaner';
  const daysUntilExpiry = Math.ceil((data.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #2563eb; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">🎉 You're Invited!</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px;">Join ${data.companyName} on CleanDay CRM</p>
  </div>

  <div style="background-color: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-top: 0;">Hi there!</p>

    <p style="font-size: 16px;">${data.invitedByName} has invited you to join <strong>${data.companyName}</strong> as a <strong>${roleDisplay}</strong> on CleanDay CRM.</p>

    <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h2 style="margin-top: 0; color: #2563eb; font-size: 20px;">Invitation Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Company:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.companyName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Role:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${roleDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Invited by:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.invitedByName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0;"><strong>Your email:</strong></td>
          <td style="padding: 10px 0; text-align: right;">${data.invitedEmail}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.inviteLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">Accept Invitation</a>
    </div>

    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #92400e;"><strong>⏰ Important:</strong></p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #92400e;">
        This invitation expires in <strong>${daysUntilExpiry} days</strong> (${data.expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}). Make sure to accept it before it expires!
      </p>
    </div>

    <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
      <p style="margin: 0; color: #1e40af;"><strong>What's CleanDay CRM?</strong></p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #1e40af;">
        CleanDay CRM is a comprehensive cleaning business management system. ${
          data.role === 'ADMIN'
            ? "As an Administrator, you'll have access to manage clients, bookings, team members, and company settings."
            : "As a Cleaner, you'll be able to view your schedule, track jobs, and manage your assignments."
        }
      </p>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      If you're unable to click the button above, copy and paste this link into your browser:<br>
      <a href="${data.inviteLink}" style="color: #2563eb; word-break: break-all;">${data.inviteLink}</a>
    </p>

    <p style="font-size: 14px; margin-top: 20px;">
      Questions? Contact ${data.invitedByName} or reply to this email.
    </p>

    <p style="font-size: 14px; margin-top: 20px;">
      Best regards,<br>
      <strong>${data.companyName}</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; font-size: 12px; color: #6b7280;">
    <p style="margin: 5px 0;">If you weren't expecting this invitation, you can safely ignore this email.</p>
    <p style="margin: 5px 0;">© ${new Date().getFullYear()} CleanDay CRM. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}
