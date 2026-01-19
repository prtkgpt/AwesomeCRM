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

export function getReferralUsedEmailTemplate(data: {
  referrerName: string;
  newCustomerName: string;
  companyName: string;
  creditsEarned: number;
  creditsBalance: number;
  referralCode: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Someone Used Your Referral Code!</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
    <h1 style="margin: 0; font-size: 28px;">Great News!</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px;">Someone used your referral code</p>
  </div>

  <div style="background-color: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${data.referrerName},</p>

    <p style="font-size: 16px;">Exciting news! <strong>${data.newCustomerName}</strong> just signed up using your referral code <strong>${data.referralCode}</strong>.</p>

    <div style="background: linear-gradient(135deg, #f3e7ff 0%, #fce7f3 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center; border: 2px solid #a855f7;">
      <div style="font-size: 14px; color: #6b21a8; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">You Earned</div>
      <div style="font-size: 42px; font-weight: bold; color: #7c3aed; margin: 10px 0;">$${data.creditsEarned.toFixed(2)}</div>
      <div style="font-size: 14px; color: #6b21a8; margin-top: 10px;">in referral credits</div>
    </div>

    <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h2 style="margin-top: 0; color: #7c3aed; font-size: 20px;">Your Referral Summary</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>New Customer:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.newCustomerName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Your Referral Code:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; background: #f3f4f6; padding: 5px 10px; border-radius: 4px;">${data.referralCode}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Credits Earned:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; color: #059669; font-weight: bold;">+$${data.creditsEarned.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0;"><strong>Total Available Credits:</strong></td>
          <td style="padding: 10px 0; text-align: right; font-size: 20px; color: #7c3aed; font-weight: bold;">$${data.creditsBalance.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
      <p style="margin: 0; color: #1e40af;"><strong>💡 How to Use Your Credits</strong></p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #1e40af;">
        Your referral credits will be automatically applied to your next booking. You can apply up to the full booking amount, and any remaining credits will stay in your account for future use.
      </p>
    </div>

    <div style="background-color: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <p style="margin: 0; color: #065f46;"><strong>🎁 Keep Earning</strong></p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #065f46;">
        Share your referral code <strong>${data.referralCode}</strong> with more friends and family to earn even more credits! There's no limit to how much you can earn.
      </p>
    </div>

    <p style="font-size: 14px; margin-top: 30px;">
      Thank you for spreading the word about ${data.companyName}! Your support means the world to us.
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

export function getBirthdayGreetingEmailTemplate(data: {
  customerName: string;
  companyName: string;
  specialOffer?: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Happy Birthday!</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <div style="font-size: 60px; margin-bottom: 15px;">🎉🎂🎈</div>
    <h1 style="margin: 0; font-size: 32px;">Happy Birthday, ${data.customerName}!</h1>
    <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.95;">Wishing you a wonderful day filled with joy!</p>
  </div>

  <div style="background-color: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-top: 0;">Dear ${data.customerName},</p>

    <p style="font-size: 16px;">On behalf of everyone at ${data.companyName}, we want to wish you a very happy birthday! 🎉</p>

    <p style="font-size: 16px;">Thank you for being a valued member of our family. We truly appreciate your trust in us and hope we can continue to serve you for many years to come.</p>

    ${data.specialOffer ? `
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center; border: 2px solid #f59e0b;">
      <div style="font-size: 24px; margin-bottom: 10px;">🎁</div>
      <p style="margin: 0; color: #92400e; font-size: 18px; font-weight: bold;">Birthday Special!</p>
      <p style="margin: 10px 0 0 0; color: #92400e; font-size: 16px;">${data.specialOffer}</p>
    </div>
    ` : ''}

    <div style="text-align: center; margin: 30px 0;">
      <p style="font-size: 48px; margin: 0;">🎂</p>
      <p style="font-size: 18px; margin: 15px 0; font-style: italic; color: #6b7280;">
        "May all your birthday wishes come true!"
      </p>
    </div>

    <p style="font-size: 16px;">We hope you have an amazing celebration surrounded by loved ones. You deserve the best!</p>

    <p style="font-size: 16px; margin-top: 25px;">
      With warmest wishes,<br>
      <strong>The ${data.companyName} Team</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; font-size: 12px; color: #6b7280;">
    <p>© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

export function getAnniversaryGreetingEmailTemplate(data: {
  customerName: string;
  companyName: string;
  yearsAgo: number;
  anniversaryType: string;
  specialOffer?: string;
}) {
  const getAnniversaryMessage = () => {
    if (data.anniversaryType === 'FIRST_BOOKING') {
      if (data.yearsAgo === 1) {
        return `It's been one year since your first cleaning with us!`;
      }
      return `It's been ${data.yearsAgo} years since your first cleaning with us!`;
    }
    if (data.anniversaryType === 'WEDDING') {
      return `Happy Wedding Anniversary!`;
    }
    return `Happy Anniversary!`;
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Happy Anniversary!</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <div style="font-size: 60px; margin-bottom: 15px;">🎊✨💙</div>
    <h1 style="margin: 0; font-size: 32px;">Happy Anniversary!</h1>
    <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.95;">${getAnniversaryMessage()}</p>
  </div>

  <div style="background-color: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-top: 0;">Dear ${data.customerName},</p>

    ${data.anniversaryType === 'FIRST_BOOKING' ? `
      <p style="font-size: 16px;">Time flies when you're having fun! We can't believe it's been ${data.yearsAgo} ${data.yearsAgo === 1 ? 'year' : 'years'} since you first trusted us with your home cleaning needs.</p>

      <p style="font-size: 16px;">Thank you for your continued loyalty and for making ${data.companyName} a part of your home care routine. It's customers like you that make what we do so rewarding!</p>
    ` : `
      <p style="font-size: 16px;">We wanted to take a moment to celebrate this special day with you!</p>

      <p style="font-size: 16px;">Thank you for allowing ${data.companyName} to be a part of your journey. We're honored to serve you and wish you all the happiness in the world!</p>
    `}

    ${data.specialOffer ? `
    <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center; border: 2px solid #3b82f6;">
      <div style="font-size: 24px; margin-bottom: 10px;">🎁</div>
      <p style="margin: 0; color: #1e40af; font-size: 18px; font-weight: bold;">Anniversary Special!</p>
      <p style="margin: 10px 0 0 0; color: #1e40af; font-size: 16px;">${data.specialOffer}</p>
    </div>
    ` : ''}

    <div style="text-align: center; margin: 30px 0; background-color: white; padding: 30px; border-radius: 12px; border: 2px solid #e5e7eb;">
      ${data.yearsAgo > 0 ? `
        <p style="font-size: 48px; margin: 0; color: #3b82f6; font-weight: bold;">${data.yearsAgo}</p>
        <p style="font-size: 20px; margin: 10px 0 0 0; color: #6b7280; font-weight: bold;">AMAZING ${data.yearsAgo === 1 ? 'YEAR' : 'YEARS'}</p>
      ` : `
        <p style="font-size: 48px; margin: 0;">💙</p>
        <p style="font-size: 20px; margin: 10px 0 0 0; color: #6b7280; font-weight: bold;">CELEBRATING WITH YOU</p>
      `}
    </div>

    <p style="font-size: 16px;">Here's to many more wonderful years together!</p>

    <p style="font-size: 16px; margin-top: 25px;">
      With heartfelt gratitude,<br>
      <strong>The ${data.companyName} Team</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; font-size: 12px; color: #6b7280;">
    <p>© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

export function getTimeOffRequestEmailTemplate(data: {
  adminName: string;
  cleanerName: string;
  companyName: string;
  timeOffType: string;
  startDate: string;
  endDate: string;
  reason?: string;
  conflictCount: number;
  dashboardUrl?: string;
}) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const typeLabels: Record<string, string> = {
    VACATION: 'Vacation',
    SICK_LEAVE: 'Sick Leave',
    PERSONAL: 'Personal Day',
    FAMILY: 'Family Emergency',
    BEREAVEMENT: 'Bereavement',
    OTHER: 'Other',
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Time Off Request</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f59e0b; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <div style="font-size: 40px; margin-bottom: 10px;">📅</div>
    <h1 style="margin: 0; font-size: 28px;">Time Off Request</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px;">Requires your approval</p>
  </div>

  <div style="background-color: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${data.adminName},</p>

    <p style="font-size: 16px;"><strong>${data.cleanerName}</strong> has submitted a time off request that needs your review.</p>

    <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h2 style="margin-top: 0; color: #f59e0b; font-size: 20px;">Request Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Team Member:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.cleanerName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Type:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${typeLabels[data.timeOffType] || data.timeOffType}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Start Date:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatDate(data.startDate)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; ${data.reason ? 'border-bottom: 1px solid #e5e7eb;' : ''}"><strong>End Date:</strong></td>
          <td style="padding: 10px 0; ${data.reason ? 'border-bottom: 1px solid #e5e7eb;' : ''} text-align: right;">${formatDate(data.endDate)}</td>
        </tr>
        ${data.reason ? `
        <tr>
          <td style="padding: 10px 0;"><strong>Reason:</strong></td>
          <td style="padding: 10px 0; text-align: right;">${data.reason}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    ${data.conflictCount > 0 ? `
    <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
      <p style="margin: 0; color: #991b1b;"><strong>⚠️ Schedule Conflict Alert</strong></p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #991b1b;">
        This time off request conflicts with <strong>${data.conflictCount} scheduled job${data.conflictCount > 1 ? 's' : ''}</strong>.
        Please review and reassign these jobs if you approve this request.
      </p>
    </div>
    ` : `
    <div style="background-color: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <p style="margin: 0; color: #065f46;"><strong>✓ No Schedule Conflicts</strong></p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #065f46;">
        This team member has no scheduled jobs during this time period.
      </p>
    </div>
    `}

    ${data.dashboardUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.dashboardUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">Review Request</a>
    </div>
    ` : ''}

    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
      Please review and respond to this request at your earliest convenience.
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

export function getTimeOffApprovedEmailTemplate(data: {
  cleanerName: string;
  companyName: string;
  timeOffType: string;
  startDate: string;
  endDate: string;
  approverName: string;
  notes?: string;
}) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const typeLabels: Record<string, string> = {
    VACATION: 'Vacation',
    SICK_LEAVE: 'Sick Leave',
    PERSONAL: 'Personal Day',
    FAMILY: 'Family Emergency',
    BEREAVEMENT: 'Bereavement',
    OTHER: 'Other',
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Time Off Approved</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #10b981; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <div style="font-size: 40px; margin-bottom: 10px;">✓</div>
    <h1 style="margin: 0; font-size: 28px;">Time Off Approved!</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px;">Your request has been approved</p>
  </div>

  <div style="background-color: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${data.cleanerName},</p>

    <p style="font-size: 16px;">Great news! Your time off request has been <strong style="color: #10b981;">approved</strong> by ${data.approverName}.</p>

    <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h2 style="margin-top: 0; color: #10b981; font-size: 20px;">Approved Time Off</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Type:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${typeLabels[data.timeOffType] || data.timeOffType}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Start Date:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatDate(data.startDate)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0;"><strong>End Date:</strong></td>
          <td style="padding: 10px 0; text-align: right;">${formatDate(data.endDate)}</td>
        </tr>
      </table>
    </div>

    ${data.notes ? `
    <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
      <p style="margin: 0; color: #1e40af;"><strong>Note from ${data.approverName}:</strong></p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #1e40af;">${data.notes}</p>
    </div>
    ` : ''}

    <div style="background-color: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <p style="margin: 0; color: #065f46;"><strong>✓ Your schedule has been updated</strong></p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #065f46;">
        This time off is now reflected in your calendar. Enjoy your time off!
      </p>
    </div>

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

export function getTimeOffDeniedEmailTemplate(data: {
  cleanerName: string;
  companyName: string;
  timeOffType: string;
  startDate: string;
  endDate: string;
  approverName: string;
  reason?: string;
}) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const typeLabels: Record<string, string> = {
    VACATION: 'Vacation',
    SICK_LEAVE: 'Sick Leave',
    PERSONAL: 'Personal Day',
    FAMILY: 'Family Emergency',
    BEREAVEMENT: 'Bereavement',
    OTHER: 'Other',
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Time Off Request Update</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ef4444; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <div style="font-size: 40px; margin-bottom: 10px;">✗</div>
    <h1 style="margin: 0; font-size: 28px;">Time Off Not Approved</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px;">Your request could not be approved at this time</p>
  </div>

  <div style="background-color: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${data.cleanerName},</p>

    <p style="font-size: 16px;">Unfortunately, your time off request could not be approved at this time.</p>

    <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h2 style="margin-top: 0; color: #ef4444; font-size: 20px;">Request Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Type:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${typeLabels[data.timeOffType] || data.timeOffType}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Start Date:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatDate(data.startDate)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0;"><strong>End Date:</strong></td>
          <td style="padding: 10px 0; text-align: right;">${formatDate(data.endDate)}</td>
        </tr>
      </table>
    </div>

    ${data.reason ? `
    <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
      <p style="margin: 0; color: #991b1b;"><strong>Reason from ${data.approverName}:</strong></p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #991b1b;">${data.reason}</p>
    </div>
    ` : ''}

    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #92400e;"><strong>What you can do:</strong></p>
      <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #92400e; font-size: 14px;">
        <li>Discuss alternative dates with your manager</li>
        <li>Submit a new request for different dates</li>
        <li>Contact ${data.approverName} for more information</li>
      </ul>
    </div>

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

export function getReviewRequestEmailTemplate(data: {
  customerName: string;
  companyName: string;
  googleReviewUrl?: string | null;
  yelpReviewUrl?: string | null;
}) {
  const hasReviewLinks = data.googleReviewUrl || data.yelpReviewUrl;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Share Your Experience</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <div style="font-size: 60px; margin-bottom: 15px;">⭐⭐⭐⭐⭐</div>
    <h1 style="margin: 0; font-size: 32px;">We'd Love Your Feedback!</h1>
    <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.95;">Your opinion matters to us</p>
  </div>

  <div style="background-color: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${data.customerName},</p>

    <p style="font-size: 16px;">Thank you for choosing ${data.companyName} for your recent cleaning service! We hope you're thrilled with the results.</p>

    <p style="font-size: 16px;">Your feedback is incredibly important to us and helps other customers make informed decisions. Would you mind taking a moment to share your experience?</p>

    ${hasReviewLinks ? `
      <div style="background-color: white; padding: 25px; border-radius: 12px; margin: 25px 0; border: 2px solid #f59e0b;">
        <p style="margin: 0 0 20px 0; font-size: 18px; font-weight: bold; color: #92400e; text-align: center;">
          ⭐ Leave a Review ⭐
        </p>

        ${data.googleReviewUrl ? `
          <div style="margin-bottom: ${data.yelpReviewUrl ? '15px' : '0'};">
            <a href="${data.googleReviewUrl}" style="display: block; background-color: #4285f4; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; text-align: center;">
              📝 Review us on Google
            </a>
          </div>
        ` : ''}

        ${data.yelpReviewUrl ? `
          <div>
            <a href="${data.yelpReviewUrl}" style="display: block; background-color: #d32323; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; text-align: center;">
              📝 Review us on Yelp
            </a>
          </div>
        ` : ''}
      </div>
    ` : `
      <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2563eb; text-align: center;">
        <p style="margin: 0; color: #1e40af; font-size: 16px;">
          📧 <strong>Reply to this email</strong> with your feedback!<br>
          We'd love to hear from you.
        </p>
      </div>
    `}

    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>✨ Why your review matters:</strong>
      </p>
      <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #92400e; font-size: 14px;">
        <li>Helps other customers discover great service</li>
        <li>Helps us improve and grow</li>
        <li>Takes less than 2 minutes</li>
        <li>Makes a huge difference to our small business</li>
      </ul>
    </div>

    <p style="font-size: 16px;">Your satisfaction is our top priority. If there's anything we could have done better, please don't hesitate to reach out to us directly.</p>

    <p style="font-size: 16px; margin-top: 25px;">
      Thank you for your support!<br>
      <strong>The ${data.companyName} Team</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; font-size: 12px; color: #6b7280;">
    <p>We appreciate you taking the time to share your experience!</p>
    <p>© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}
