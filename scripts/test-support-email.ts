/**
 * One-off: send a real support-reply email to verify the template + Resend wiring.
 * Run: npx tsx scripts/test-support-email.ts
 */
import "dotenv/config";

// Force production URL for test emails so links resolve to the real site
process.env.EMAIL_BASE_URL = process.env.EMAIL_BASE_URL || "https://copytradespro.com";

import { sendSupportReplyEmail } from "../src/lib/email";

async function main() {
  const to = process.argv[2] || "makindedaniel45@gmail.com";
  const name = "Daniel";
  const subject = "Account verification follow-up";
  const preview = `Hi Daniel — just confirming the documents you uploaded yesterday have been received and verified. Your tier upgrade to Diamond is now live on the account.

Let me know if there's anything else I can help you with.

— Sarah, Support Lead`;
  const threadId = "test-thread-" + Date.now();

  console.log(`→ Sending support reply email to ${to}…`);
  const result = await sendSupportReplyEmail(to, name, subject, preview, threadId, false);
  console.log("Result:", JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
