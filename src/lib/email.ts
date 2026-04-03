import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Email Templates ───

function verificationEmailHtml(name: string, verifyUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1118;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#1a1d29;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.06)">
    <div style="padding:32px 32px 0;text-align:center">
      <h1 style="color:#fff;font-size:20px;margin:0 0 8px">Verify your email</h1>
      <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 24px;line-height:1.5">Hi ${name}, confirm your email to start using CopyTrade Pro.</p>
      <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600">Verify Email</a>
      <p style="color:rgba(255,255,255,0.35);font-size:12px;margin:24px 0 0;line-height:1.5">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
    </div>
    <div style="padding:24px 32px;margin-top:24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
      <p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0">&copy; CopyTrade Pro</p>
    </div>
  </div>
</body>
</html>`;
}

function passwordResetEmailHtml(name: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1118;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#1a1d29;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.06)">
    <div style="padding:32px 32px 0;text-align:center">
      <h1 style="color:#fff;font-size:20px;margin:0 0 8px">Reset your password</h1>
      <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 24px;line-height:1.5">Hi ${name}, we received a request to reset your password.</p>
      <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600">Reset Password</a>
      <p style="color:rgba(255,255,255,0.35);font-size:12px;margin:24px 0 0;line-height:1.5">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div style="padding:24px 32px;margin-top:24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
      <p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0">&copy; CopyTrade Pro</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Email Sending ───

interface SendEmailResult {
  success: boolean;
  error?: string;
}

async function callEmailFunction(payload: {
  to: string;
  subject: string;
  html: string;
  type: string;
}): Promise<SendEmailResult> {
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: payload,
    });

    if (error) {
      console.error("[email] Edge function error:", error);
      return { success: false, error: error.message };
    }

    if (data?.success) {
      return { success: true };
    }

    return { success: false, error: data?.error || "Unknown email error" };
  } catch (err) {
    console.error("[email] Failed to invoke edge function:", err);
    return { success: false, error: "Email service unavailable" };
  }
}

// ─── Public API ───

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

  return callEmailFunction({
    to: email,
    subject: "Verify your email — CopyTrade Pro",
    html: verificationEmailHtml(name, verifyUrl),
    type: "verification",
  });
}

export async function sendOtpEmail(
  email: string,
  code: string
): Promise<SendEmailResult> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1118;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#1a1d29;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.06)">
    <div style="padding:32px 32px 0;text-align:center">
      <h1 style="color:#fff;font-size:20px;margin:0 0 8px">Your verification code</h1>
      <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 24px;line-height:1.5">Enter this code to verify your email and continue signing up.</p>
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin:0 auto;display:inline-block">
        <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#fff;font-family:monospace">${code}</span>
      </div>
      <p style="color:rgba(255,255,255,0.35);font-size:12px;margin:24px 0 0;line-height:1.5">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
    </div>
    <div style="padding:24px 32px;margin-top:24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
      <p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0">&copy; CopyTrade Pro</p>
    </div>
  </div>
</body>
</html>`;

  return callEmailFunction({
    to: email,
    subject: "Your verification code — CopyTrade Pro",
    html,
    type: "otp",
  });
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  return callEmailFunction({
    to: email,
    subject: "Reset your password — CopyTrade Pro",
    html: passwordResetEmailHtml(name, resetUrl),
    type: "password_reset",
  });
}
