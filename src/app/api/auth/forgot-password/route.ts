import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success even if user doesn't exist (security best practice)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, a reset link has been sent',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send reset email
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    const emailHtml = getPasswordResetEmailTemplate({
      name: user.name,
      resetUrl,
    });

    await sendEmail({
      to: email,
      subject: 'Reset Your Password - CleanDayCRM',
      html: emailHtml,
      type: 'notification',
    });

    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, a reset link has been sent',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

function getPasswordResetEmailTemplate(data: {
  name: string;
  resetUrl: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #2563eb; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">Reset Your Password</h1>
  </div>

  <div style="background-color: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-top: 0;">Hi ${data.name},</p>

    <p style="font-size: 16px;">We received a request to reset your password for your CleanDayCRM account.</p>

    <p style="font-size: 16px;">Click the button below to reset your password:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.resetUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">
        Reset Password
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280;">
      This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>

    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="font-size: 12px; color: #6b7280; word-break: break-all;">
      ${data.resetUrl}
    </p>

    <p style="font-size: 14px; margin-top: 30px;">
      Best regards,<br>
      <strong>CleanDayCRM Team</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; font-size: 12px; color: #6b7280;">
    <p>© ${new Date().getFullYear()} CleanDayCRM. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}
