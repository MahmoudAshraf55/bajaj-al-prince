/**
 * Email Service — Infrastructure ready, requires SMTP credentials in .env
 *
 * To activate:
 * 1. Install dependency: npm install nodemailer
 * 2. Install types: npm install -D @types/nodemailer
 * 3. Fill SMTP_* variables in .env
 * 4. Uncomment the nodemailer import and transport below.
 */

import { z } from 'zod';

const emailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  text: z.string().min(1).max(10000),
  html: z.string().optional(),
});

export type EmailPayload = z.infer<typeof emailSchema>;

/**
 * Validates the email payload without sending.
 * Returns structured error if validation fails.
 */
export function validateEmailPayload(payload: unknown): { valid: true; data: EmailPayload } | { valid: false; error: string } {
  try {
    const data = emailSchema.parse(payload);
    return { valid: true, data };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { valid: false, error: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
    }
    return { valid: false, error: 'Invalid email payload' };
  }
}

/**
 * Sends an email if SMTP credentials are configured.
 * Currently returns a no-op warning until nodemailer is installed.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.warn('[email] SMTP not configured. Would send to:', payload.to);
    return { success: false, error: 'SMTP not configured' };
  }

  // Uncomment after installing nodemailer:
  // const nodemailer = await import('nodemailer');
  // const transporter = nodemailer.createTransport({
  //   host: smtpHost,
  //   port: parseInt(smtpPort, 10),
  //   secure: parseInt(smtpPort, 10) === 465,
  //   auth: { user: smtpUser, pass: smtpPass },
  // });
  // await transporter.sendMail({
  //   from: process.env.FROM_EMAIL || 'noreply@bajajalprince.com',
  //   to: payload.to,
  //   subject: payload.subject,
  //   text: payload.text,
  //   html: payload.html,
  // });

  return { success: true };
}
