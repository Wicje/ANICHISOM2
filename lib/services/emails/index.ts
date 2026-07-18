/**
 * ContinuaOS — Email Service
 * 
 * Sends transactional emails via Resend.
 * Configure RESEND_API_KEY and RESEND_FROM_EMAIL in .env.local.
 */

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ContinuaOS <noreply@continuaos.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://continuaos.com';

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend && RESEND_API_KEY) {
    resend = new Resend(RESEND_API_KEY);
  }
  if (!resend) {
    throw new Error('Resend not configured. Set RESEND_API_KEY in .env.local');
  }
  return resend;
}

// ─── Email Templates ────────────────────────────────────────

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const client = getResend();
    await client.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return true;
  } catch (error) {
    console.error('[Email] Failed to send:', error);
    return false;
  }
}

// ─── Welcome Email ──────────────────────────────────────────

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Welcome to ContinuaOS!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #e2e8f0;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #00d4ff, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">
            ContinuaOS
          </h1>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 8px;">The Creative Operating System</p>
        </div>
        
        <h2 style="color: #f8fafc; font-size: 24px; margin-bottom: 16px;">Welcome, ${name}!</h2>
        
        <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Your account has been created and is ready to go. ContinuaOS is your browser-based workspace for creative dominance.
        </p>
        
        <div style="background: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h3 style="color: #f8fafc; font-size: 18px; margin: 0 0 12px 0;">Getting Started</h3>
          <ul style="color: #cbd5e1; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
            <li>Choose your role during onboarding</li>
            <li>Pick the apps that match your workflow</li>
            <li>Explore the Command Palette (Cmd+K)</li>
            <li>Connect cloud storage (Google Drive, Dropbox)</li>
          </ul>
        </div>
        
        <a href="${APP_URL}" style="display: inline-block; background: linear-gradient(135deg, #00d4ff, #7c3aed); color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Open ContinuaOS
        </a>
        
        <p style="color: #64748b; font-size: 12px; margin-top: 40px; text-align: center;">
          If you didn't create this account, please ignore this email.
        </p>
      </body>
      </html>
    `,
    text: `Welcome to ContinuaOS, ${name}!\n\nYour account is ready. Open ContinuaOS at ${APP_URL}\n\nGetting Started:\n- Choose your role during onboarding\n- Pick the apps that match your workflow\n- Explore the Command Palette (Cmd+K)\n- Connect cloud storage (Google Drive, Dropbox)`,
  });
}

// ─── Approval Email ─────────────────────────────────────────

export async function sendApprovalEmail(email: string, name: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Your ContinuaOS Account Has Been Approved!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #e2e8f0;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #00d4ff, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">
            ContinuaOS
          </h1>
        </div>
        
        <h2 style="color: #f8fafc; font-size: 24px; margin-bottom: 16px;">You're In, ${name}!</h2>
        
        <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Your account has been approved. You now have full access to ContinuaOS and all your installed apps.
        </p>
        
        <a href="${APP_URL}" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Launch ContinuaOS
        </a>
      </body>
      </html>
    `,
    text: `Your ContinuaOS account has been approved, ${name}!\n\nYou now have full access. Launch ContinuaOS at ${APP_URL}`,
  });
}

// ─── Rejection Email ────────────────────────────────────────

export async function sendRejectionEmail(email: string, name: string, reason?: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'ContinuaOS Account Update',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #e2e8f0;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #00d4ff, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">
            ContinuaOS
          </h1>
        </div>
        
        <h2 style="color: #f8fafc; font-size: 24px; margin-bottom: 16px;">Account Update</h2>
        
        <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Hi ${name}, your ContinuaOS account request was not approved at this time.
          ${reason ? `<br><br><strong>Reason:</strong> ${reason}` : ''}
        </p>
        
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
          If you believe this was an error, please contact our support team.
        </p>
      </body>
      </html>
    `,
    text: `Hi ${name},\n\nYour ContinuaOS account request was not approved at this time.${reason ? `\n\nReason: ${reason}` : ''}\n\nIf you believe this was an error, please contact our support team.`,
  });
}

// ─── Trial Expiry Warning ───────────────────────────────────

export async function sendTrialExpiryEmail(email: string, name: string, daysLeft: number): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `Your ContinuaOS Pro Trial Ends in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #e2e8f0;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #00d4ff, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">
            ContinuaOS
          </h1>
        </div>
        
        <h2 style="color: #f8fafc; font-size: 24px; margin-bottom: 16px;">Trial Ending Soon</h2>
        
        <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Hi ${name}, your ContinuaOS Pro trial ends in <strong>${daysLeft} day${daysLeft > 1 ? 's' : ''}</strong>.
          Upgrade to keep all Pro features.
        </p>
        
        <div style="background: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h3 style="color: #f8fafc; font-size: 16px; margin: 0 0 12px 0;">Pro Features You'll Lose:</h3>
          <ul style="color: #cbd5e1; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
            <li>50 GB storage</li>
            <li>Unlimited cloud connections</li>
            <li>Priority support</li>
            <li>Advanced analytics</li>
          </ul>
        </div>
        
        <a href="${APP_URL}/settings/billing" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Upgrade to Pro
        </a>
      </body>
      </html>
    `,
    text: `Hi ${name},\n\nYour ContinuaOS Pro trial ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}.\n\nUpgrade to keep all Pro features at ${APP_URL}/settings/billing`,
  });
}

// ─── Password Reset ─────────────────────────────────────────

export async function sendPasswordResetEmail(email: string, name: string, resetUrl: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Reset Your ContinuaOS Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #e2e8f0;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #00d4ff, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">
            ContinuaOS
          </h1>
        </div>
        
        <h2 style="color: #f8fafc; font-size: 24px; margin-bottom: 16px;">Password Reset</h2>
        
        <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Hi ${name}, we received a request to reset your password.
        </p>
        
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #00d4ff, #7c3aed); color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Reset Password
        </a>
        
        <p style="color: #64748b; font-size: 12px; margin-top: 40px; text-align: center;">
          This link expires in 1 hour. If you didn't request this, please ignore this email.
        </p>
      </body>
      </html>
    `,
    text: `Hi ${name},\n\nReset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
  });
}

// ─── Marketplace App Approved ───────────────────────────────

export async function sendAppApprovedEmail(
  email: string,
  name: string,
  appName: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `Your App "${appName}" Has Been Published!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #e2e8f0;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #00d4ff, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">
            ContinuaOS
          </h1>
        </div>
        
        <h2 style="color: #f8fafc; font-size: 24px; margin-bottom: 16px;">App Published!</h2>
        
        <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Hi ${name}, your app <strong>"${appName}"</strong> has been reviewed and published to the ContinuaOS Marketplace.
        </p>
        
        <a href="${APP_URL}/app-store" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          View in Marketplace
        </a>
      </body>
      </html>
    `,
    text: `Hi ${name},\n\nYour app "${appName}" has been published to the ContinuaOS Marketplace.\n\nView it at ${APP_URL}/app-store`,
  });
}

// ─── Marketplace App Rejected ───────────────────────────────

export async function sendAppRejectedEmail(
  email: string,
  name: string,
  appName: string,
  reason?: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `ContinuaOS Marketplace — "${appName}" Review Update`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #e2e8f0;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #00d4ff, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">
            ContinuaOS
          </h1>
        </div>
        
        <h2 style="color: #f8fafc; font-size: 24px; margin-bottom: 16px;">App Review Update</h2>
        
        <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Hi ${name}, your app <strong>"${appName}"</strong> was not approved for the marketplace.
          ${reason ? `<br><br><strong>Feedback:</strong> ${reason}` : ''}
        </p>
        
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
          Please review the feedback and resubmit when ready.
        </p>
      </body>
      </html>
    `,
    text: `Hi ${name},\n\nYour app "${appName}" was not approved for the marketplace.${reason ? `\n\nFeedback: ${reason}` : ''}\n\nPlease review the feedback and resubmit when ready.`,
  });
}
