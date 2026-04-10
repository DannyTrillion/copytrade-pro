import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function getFrom(): string {
  return process.env.EMAIL_FROM || "CopyTradesPro <onboarding@resend.dev>";
}

// ─── Premium Email Template ───

function baseTemplate(content: string): string {
  const year = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
</head>
<body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;-webkit-font-smoothing:antialiased">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px">
    <!-- Logo header -->
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-block;background:#0D71FF;width:40px;height:40px;border-radius:12px;line-height:40px;text-align:center">
        <span style="color:#fff;font-size:16px;font-weight:800">W</span>
      </div>
      <p style="color:rgba(255,255,255,0.4);font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:12px 0 0">CopyTradesPro</p>
    </div>

    <!-- Main card -->
    <div style="background:#0a0a12;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.06)">
      ${content}
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:32px">
      <p style="color:rgba(255,255,255,0.15);font-size:11px;margin:0 0 8px;line-height:1.5">
        &copy; ${year} CopyTradesPro &middot; Powered by Webull
      </p>
      <p style="color:rgba(255,255,255,0.1);font-size:10px;margin:0">
        copytradespro.com
      </p>
    </div>
  </div>
</body>
</html>`;
}

function ctaButton(text: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr><td>
    <a href="${url}" style="display:inline-block;background:#0D71FF;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:50px;font-size:14px;font-weight:600;letter-spacing:0.3px">${text}</a>
  </td></tr></table>`;
}

function statBlock(label: string, value: string, color: string = "#fff"): string {
  return `<div style="text-align:center;flex:1">
    <p style="color:${color};font-size:28px;font-weight:700;margin:0;font-variant-numeric:tabular-nums">${value}</p>
    <p style="color:rgba(255,255,255,0.3);font-size:10px;margin:6px 0 0;text-transform:uppercase;letter-spacing:1.5px">${label}</p>
  </div>`;
}

function divider(): string {
  return `<div style="height:1px;background:rgba(255,255,255,0.05);margin:0 32px"></div>`;
}

// ─── Sending ───

interface SendEmailResult {
  success: boolean;
  error?: string;
}

async function sendEmail(to: string, subject: string, html: string): Promise<SendEmailResult> {
  try {
    const { error } = await resend.emails.send({ from: getFrom(), to, subject, html });
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

  return sendEmail(email, "Verify your email — CopyTradesPro", baseTemplate(`
    <div style="padding:40px 32px;text-align:center">
      <div style="width:56px;height:56px;margin:0 auto 20px;background:rgba(13,113,255,0.1);border-radius:50%;line-height:56px">
        <span style="font-size:24px">✉️</span>
      </div>
      <h1 style="color:#fff;font-size:24px;margin:0 0 8px;font-weight:700;letter-spacing:-0.5px">Verify Your Email</h1>
      <p style="color:rgba(255,255,255,0.45);font-size:14px;margin:0 0 32px;line-height:1.6">Hi ${name}, confirm your email to start trading with CopyTradesPro.</p>
      ${ctaButton("Verify Email", verifyUrl)}
      <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:28px 0 0;line-height:1.5">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
    </div>
  `));
}

export async function sendOtpEmail(email: string, code: string): Promise<SendEmailResult> {
  return sendEmail(email, `${code} — Your CopyTradesPro verification code`, baseTemplate(`
    <div style="padding:40px 32px;text-align:center">
      <div style="width:56px;height:56px;margin:0 auto 20px;background:rgba(13,113,255,0.1);border-radius:50%;line-height:56px">
        <span style="font-size:24px">🔐</span>
      </div>
      <h1 style="color:#fff;font-size:24px;margin:0 0 8px;font-weight:700;letter-spacing:-0.5px">Verification Code</h1>
      <p style="color:rgba(255,255,255,0.45);font-size:14px;margin:0 0 28px;line-height:1.6">Enter this code to verify your email address.</p>
      <div style="background:rgba(13,113,255,0.06);border:1px solid rgba(13,113,255,0.12);border-radius:16px;padding:28px 20px;display:inline-block;min-width:240px">
        <span style="font-size:44px;font-weight:800;letter-spacing:12px;color:#fff;font-family:'SF Mono',Monaco,Consolas,monospace">${code}</span>
      </div>
      <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:28px 0 0;line-height:1.5">Code expires in 10 minutes. Don't share this code with anyone.</p>
    </div>
  `));
}

export async function sendPasswordResetEmail(email: string, name: string, token: string): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  return sendEmail(email, "Reset your password — CopyTradesPro", baseTemplate(`
    <div style="padding:40px 32px;text-align:center">
      <div style="width:56px;height:56px;margin:0 auto 20px;background:rgba(255,152,0,0.1);border-radius:50%;line-height:56px">
        <span style="font-size:24px">🔑</span>
      </div>
      <h1 style="color:#fff;font-size:24px;margin:0 0 8px;font-weight:700;letter-spacing:-0.5px">Reset Password</h1>
      <p style="color:rgba(255,255,255,0.45);font-size:14px;margin:0 0 32px;line-height:1.6">Hi ${name}, we received a request to reset your password.</p>
      ${ctaButton("Reset Password", resetUrl)}
      <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:28px 0 0;line-height:1.5">Link expires in 1 hour. If you didn't request this, your account is safe — just ignore this email.</p>
    </div>
  `));
}

// ─── Transactional Emails ───

export async function sendDepositConfirmedEmail(email: string, name: string, amount: number): Promise<SendEmailResult> {
  const formatted = amount.toLocaleString(undefined, { minimumFractionDigits: 2 });

  return sendEmail(email, `Deposit confirmed: $${formatted} — CopyTradesPro`, baseTemplate(`
    <div style="padding:40px 32px;text-align:center">
      <div style="width:56px;height:56px;margin:0 auto 20px;background:rgba(38,166,154,0.1);border-radius:50%;line-height:56px">
        <span style="font-size:24px">✅</span>
      </div>
      <h1 style="color:#fff;font-size:24px;margin:0 0 8px;font-weight:700;letter-spacing:-0.5px">Deposit Confirmed</h1>
      <p style="color:rgba(255,255,255,0.45);font-size:14px;margin:0 0 28px;line-height:1.6">Hi ${name}, your deposit has been confirmed and is now in your balance.</p>
      <div style="background:rgba(38,166,154,0.06);border:1px solid rgba(38,166,154,0.12);border-radius:16px;padding:24px;margin:0 0 28px">
        <p style="color:rgba(255,255,255,0.3);font-size:10px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1.5px">Amount Deposited</p>
        <p style="color:#26A69A;font-size:36px;font-weight:800;margin:0;font-variant-numeric:tabular-nums">$${formatted}</p>
      </div>
      ${ctaButton("View Dashboard", process.env.NEXTAUTH_URL || "http://localhost:3000")}
    </div>
  `));
}

export async function sendWithdrawalStatusEmail(email: string, name: string, amount: number, status: "APPROVED" | "REJECTED", reason?: string): Promise<SendEmailResult> {
  const isApproved = status === "APPROVED";
  const color = isApproved ? "#26A69A" : "#EF5350";
  const emoji = isApproved ? "✅" : "❌";
  const statusText = isApproved ? "Approved" : "Rejected";
  const formatted = amount.toLocaleString(undefined, { minimumFractionDigits: 2 });

  return sendEmail(email, `Withdrawal ${statusText}: $${formatted} — CopyTradesPro`, baseTemplate(`
    <div style="padding:40px 32px;text-align:center">
      <div style="width:56px;height:56px;margin:0 auto 20px;background:${isApproved ? "rgba(38,166,154,0.1)" : "rgba(239,83,80,0.1)"};border-radius:50%;line-height:56px">
        <span style="font-size:24px">${emoji}</span>
      </div>
      <h1 style="color:#fff;font-size:24px;margin:0 0 8px;font-weight:700;letter-spacing:-0.5px">Withdrawal ${statusText}</h1>
      <p style="color:rgba(255,255,255,0.45);font-size:14px;margin:0 0 28px;line-height:1.6">Hi ${name}, your withdrawal request has been ${statusText.toLowerCase()}.</p>
      <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:16px;padding:24px;margin:0 0 28px">
        <p style="color:rgba(255,255,255,0.3);font-size:10px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1.5px">Amount</p>
        <p style="color:${color};font-size:36px;font-weight:800;margin:0;font-variant-numeric:tabular-nums">$${formatted}</p>
      </div>
      ${reason ? `<div style="background:rgba(239,83,80,0.05);border:1px solid rgba(239,83,80,0.1);border-radius:12px;padding:16px;margin:0 0 28px;text-align:left"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0"><strong style="color:rgba(255,255,255,0.7)">Reason:</strong> ${reason}</p></div>` : ""}
      ${ctaButton("View Dashboard", process.env.NEXTAUTH_URL || "http://localhost:3000")}
    </div>
  `));
}

export async function sendTierUpgradeEmail(email: string, name: string, tierName: string): Promise<SendEmailResult> {
  return sendEmail(email, `Upgraded to ${tierName}! — CopyTradesPro`, baseTemplate(`
    <div style="padding:40px 32px;text-align:center">
      <div style="width:56px;height:56px;margin:0 auto 20px;background:rgba(212,175,55,0.1);border-radius:50%;line-height:56px">
        <span style="font-size:24px">⭐</span>
      </div>
      <h1 style="color:#fff;font-size:24px;margin:0 0 8px;font-weight:700;letter-spacing:-0.5px">Tier Upgrade!</h1>
      <p style="color:rgba(255,255,255,0.45);font-size:14px;margin:0 0 28px;line-height:1.6">Congratulations ${name}, you've been upgraded!</p>
      <div style="background:linear-gradient(135deg,rgba(212,175,55,0.08),rgba(212,175,55,0.03));border:1px solid rgba(212,175,55,0.15);border-radius:16px;padding:28px;margin:0 0 28px">
        <p style="color:rgba(255,255,255,0.3);font-size:10px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1.5px">New Tier</p>
        <p style="color:#D4AF37;font-size:32px;font-weight:800;margin:0">${tierName}</p>
        <p style="color:rgba(255,255,255,0.35);font-size:13px;margin:12px 0 0">Lower commissions &middot; More daily trades</p>
      </div>
      ${ctaButton("View Dashboard", `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard`)}
    </div>
  `));
}

// ─── Admin Notifications ───

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || "makindedaniel45@gmail.com";

export async function notifyAdminNewSignup(userName: string, userEmail: string): Promise<SendEmailResult> {
  const time = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  return sendEmail(ADMIN_EMAIL, `New Signup: ${userName} — CopyTradesPro`, baseTemplate(`
    <div style="padding:40px 32px">
      <div style="text-align:center;margin-bottom:24px">
        <div style="width:56px;height:56px;margin:0 auto 16px;background:rgba(13,113,255,0.1);border-radius:50%;line-height:56px">
          <span style="font-size:24px">👤</span>
        </div>
        <h1 style="color:#fff;font-size:24px;margin:0 0 4px;font-weight:700;letter-spacing:-0.5px">New User Signup</h1>
        <p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0">A new user just joined CopyTradesPro</p>
      </div>
      ${divider()}
      <div style="padding:24px 0">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="padding:8px 0;color:rgba(255,255,255,0.3);font-size:12px;text-transform:uppercase;letter-spacing:1px">Name</td>
            <td style="padding:8px 0;color:#fff;font-size:14px;font-weight:600;text-align:right">${userName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:rgba(255,255,255,0.3);font-size:12px;text-transform:uppercase;letter-spacing:1px">Email</td>
            <td style="padding:8px 0;color:#fff;font-size:14px;font-weight:600;text-align:right">${userEmail}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:rgba(255,255,255,0.3);font-size:12px;text-transform:uppercase;letter-spacing:1px">Time</td>
            <td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:14px;text-align:right">${time}</td>
          </tr>
        </table>
      </div>
      <div style="text-align:center">
        ${ctaButton("View in Admin", `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/admin/users`)}
      </div>
    </div>
  `));
}
