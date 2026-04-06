import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Email sender address.
 * Set EMAIL_FROM env var to your verified Resend domain (e.g. "CopyTrade Pro <noreply@yourdomain.com>")
 * Until a domain is verified, uses Resend's shared test sender which works for all recipients.
 */
function getFrom(): string {
  return process.env.EMAIL_FROM || "CopyTrade Pro <onboarding@resend.dev>";
}

// ─── Email Templates ───

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#0f0f1a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06)">
    ${content}
    <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
      <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0">&copy; ${new Date().getFullYear()} CopyTrade Pro. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

function ctaButton(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#2962FF,#1E4FCC);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:600;box-shadow:0 2px 12px rgba(41,98,255,0.3)">${text}</a>`;
}

// ─── Sending ───

interface SendEmailResult {
  success: boolean;
  error?: string;
}

async function sendEmail(to: string, subject: string, html: string): Promise<SendEmailResult> {
  try {
    const { error } = await resend.emails.send({
      from: getFrom(),
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[email] Failed to send:", err);
    return { success: false, error: "Email service unavailable" };
  }
}

// ─── Auth Emails ───

export async function sendVerificationEmail(email: string, name: string, token: string): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

  return sendEmail(email, "Verify your email — CopyTrade Pro", baseTemplate(`
    <div style="padding:32px 32px 24px;text-align:center">
      <h1 style="color:#fff;font-size:22px;margin:0 0 8px;font-weight:600">Verify your email</h1>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 28px;line-height:1.6">Hi ${name}, confirm your email to start using CopyTrade Pro.</p>
      ${ctaButton("Verify Email", verifyUrl)}
      <p style="color:rgba(255,255,255,0.25);font-size:12px;margin:28px 0 0;line-height:1.5">This link expires in 24 hours.</p>
    </div>
  `));
}

export async function sendOtpEmail(email: string, code: string): Promise<SendEmailResult> {
  return sendEmail(email, `${code} is your verification code — CopyTrade Pro`, baseTemplate(`
    <div style="padding:32px 32px 24px;text-align:center">
      <h1 style="color:#fff;font-size:22px;margin:0 0 8px;font-weight:600">Your verification code</h1>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 28px;line-height:1.6">Enter this code to verify your email.</p>
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:24px;display:inline-block">
        <span style="font-size:40px;font-weight:700;letter-spacing:10px;color:#fff;font-family:monospace">${code}</span>
      </div>
      <p style="color:rgba(255,255,255,0.25);font-size:12px;margin:28px 0 0;line-height:1.5">Expires in 10 minutes.</p>
    </div>
  `));
}

export async function sendPasswordResetEmail(email: string, name: string, token: string): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  return sendEmail(email, "Reset your password — CopyTrade Pro", baseTemplate(`
    <div style="padding:32px 32px 24px;text-align:center">
      <h1 style="color:#fff;font-size:22px;margin:0 0 8px;font-weight:600">Reset your password</h1>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 28px;line-height:1.6">Hi ${name}, we received a request to reset your password.</p>
      ${ctaButton("Reset Password", resetUrl)}
      <p style="color:rgba(255,255,255,0.25);font-size:12px;margin:28px 0 0;line-height:1.5">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    </div>
  `));
}

// ─── Transactional Emails ───

export async function sendDepositConfirmedEmail(email: string, name: string, amount: number): Promise<SendEmailResult> {
  return sendEmail(email, `Deposit of $${amount.toLocaleString()} confirmed — CopyTrade Pro`, baseTemplate(`
    <div style="padding:32px 32px 24px;text-align:center">
      <div style="width:56px;height:56px;margin:0 auto 16px;background:rgba(38,166,154,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center">
        <span style="font-size:28px">✓</span>
      </div>
      <h1 style="color:#fff;font-size:22px;margin:0 0 8px;font-weight:600">Deposit Confirmed</h1>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 20px;line-height:1.6">Hi ${name}, your deposit has been confirmed and added to your balance.</p>
      <div style="background:rgba(38,166,154,0.08);border:1px solid rgba(38,166,154,0.15);border-radius:12px;padding:20px;margin:0 0 24px">
        <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Amount Deposited</p>
        <p style="color:#26A69A;font-size:32px;font-weight:700;margin:0;font-variant-numeric:tabular-nums">$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
      </div>
      ${ctaButton("View Dashboard", process.env.NEXTAUTH_URL || "http://localhost:3000")}
    </div>
  `));
}

export async function sendWithdrawalStatusEmail(email: string, name: string, amount: number, status: "APPROVED" | "REJECTED", reason?: string): Promise<SendEmailResult> {
  const isApproved = status === "APPROVED";
  const color = isApproved ? "#26A69A" : "#EF5350";
  const icon = isApproved ? "✓" : "✕";
  const statusText = isApproved ? "Approved" : "Rejected";

  return sendEmail(email, `Withdrawal ${statusText} — CopyTrade Pro`, baseTemplate(`
    <div style="padding:32px 32px 24px;text-align:center">
      <div style="width:56px;height:56px;margin:0 auto 16px;background:${isApproved ? "rgba(38,166,154,0.1)" : "rgba(239,83,80,0.1)"};border-radius:50%;display:flex;align-items:center;justify-content:center">
        <span style="font-size:28px;color:${color}">${icon}</span>
      </div>
      <h1 style="color:#fff;font-size:22px;margin:0 0 8px;font-weight:600">Withdrawal ${statusText}</h1>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 20px;line-height:1.6">Hi ${name}, your withdrawal request has been ${statusText.toLowerCase()}.</p>
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;margin:0 0 24px">
        <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Amount</p>
        <p style="color:${color};font-size:32px;font-weight:700;margin:0;font-variant-numeric:tabular-nums">$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
      </div>
      ${reason ? `<p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0 0 24px;line-height:1.5"><strong style="color:rgba(255,255,255,0.6)">Reason:</strong> ${reason}</p>` : ""}
      ${ctaButton("View Dashboard", process.env.NEXTAUTH_URL || "http://localhost:3000")}
    </div>
  `));
}

export async function sendTierUpgradeEmail(email: string, name: string, tierName: string): Promise<SendEmailResult> {
  return sendEmail(email, `You've been upgraded to ${tierName}! — CopyTrade Pro`, baseTemplate(`
    <div style="padding:32px 32px 24px;text-align:center">
      <div style="width:56px;height:56px;margin:0 auto 16px;background:rgba(212,175,55,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center">
        <span style="font-size:28px">★</span>
      </div>
      <h1 style="color:#fff;font-size:22px;margin:0 0 8px;font-weight:600">Tier Upgrade!</h1>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 20px;line-height:1.6">Congratulations ${name}, you've been upgraded to <strong style="color:#D4AF37">${tierName}</strong>!</p>
      <div style="background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.12);border-radius:12px;padding:20px;margin:0 0 24px">
        <p style="color:#D4AF37;font-size:24px;font-weight:700;margin:0">${tierName}</p>
        <p style="color:rgba(255,255,255,0.4);font-size:13px;margin:8px 0 0">Enjoy lower commissions and more daily trades</p>
      </div>
      ${ctaButton("View Your Tier", `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard`)}
    </div>
  `));
}
