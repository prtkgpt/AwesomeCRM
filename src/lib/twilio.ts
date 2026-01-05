import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
export const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.warn('Twilio credentials not configured. SMS features will not work.');
}

export const twilioClient = accountSid && authToken
  ? twilio(accountSid, authToken)
  : null;

/**
 * Send an SMS message via Twilio
 * Supports company-specific credentials or falls back to env vars
 */
export async function sendSMS(
  to: string,
  body: string,
  options?: {
    accountSid?: string;
    authToken?: string;
    from?: string;
  }
) {
  // Use company-specific credentials if provided, otherwise use default
  const sid = options?.accountSid || accountSid;
  const token = options?.authToken || authToken;
  const from = options?.from || twilioPhoneNumber;

  if (!sid || !token || !from) {
    return {
      success: false,
      error: 'Twilio is not configured',
    };
  }

  try {
    // Create client with provided or default credentials
    const client = twilio(sid, token);

    const message = await client.messages.create({
      body,
      from,
      to,
    });

    return {
      success: true,
      sid: message.sid,
      status: message.status,
    };
  } catch (error) {
    console.error('Twilio SMS error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Replace template variables with actual values
 */
export function fillTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  });

  return result;
}
