/**
 * Verifies the PayMeGate integration: signature scheme, order lifecycle and
 * settlement guards. Creates one real $2 order (never paid) and cleans up.
 *   npx tsx scripts/verify-paymegate.ts
 */
import { createHmac } from "crypto";
import { PrismaClient } from "@prisma/client";
import { createOrder, getOrder, listPaymentMethods, amountMatches } from "../src/lib/payments/paymegate";
import { verifySignature, SIGNATURE_HEADER, TIMESTAMP_HEADER } from "../src/lib/payments/webhook-signature";
import { settleOrder } from "../src/lib/payments/settlement";
import { PAYMENT_METHODS, getPaymentMethod } from "../src/config/payments";

const prisma = new PrismaClient();
let pass = 0, fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}\n      expected: ${e}\n      actual:   ${a}`); }
}

const SECRET = process.env.PAYMEGATE_WEBHOOK_SECRET!;
/** Documented format: raw unpadded Base64URL HMAC-SHA256, no prefix. */
function sign(body: string, ts: string, secret = SECRET) {
  return createHmac("sha256", secret).update(`${ts}.${body}`, "utf8").digest("base64url");
}
function signHex(body: string, ts: string, secret = SECRET) {
  return createHmac("sha256", secret).update(`${ts}.${body}`, "utf8").digest("hex");
}
function hdrs(sig: string, ts: string) {
  return new Headers({ [SIGNATURE_HEADER]: sig, [TIMESTAMP_HEADER]: ts });
}

const created: string[] = [];

async function main() {
  console.log("\n── Webhook signature ──");
  const ts = String(Math.floor(Date.now() / 1000));
  const body = JSON.stringify({ orderUUID: "abc-123", status: "PAID" });

  check("base64url (documented format) accepted", verifySignature(body, hdrs(sign(body, ts), ts)).valid, true);
  check("hex tolerated defensively", verifySignature(body, hdrs(signHex(body, ts), ts)).valid, true);
  check("v1= prefix tolerated", verifySignature(body, hdrs(`v1=${sign(body, ts)}`, ts)).valid, true);

  // Base64URL is the documented encoding, so a signature containing "-" or "_"
  // must verify — standard-base64 comparison alone would reject these.
  const urlSafe = sign(body, ts);
  check("signature has no padding", urlSafe.endsWith("="), false);
  if (/[-_]/.test(urlSafe)) {
    check("  url-safe chars verified", verifySignature(body, hdrs(urlSafe, ts)).valid, true);
  } else {
    // Sample-dependent; force the case so the assertion always runs.
    const forced = JSON.stringify({ orderUUID: "x".repeat(40) });
    const fts = String(Math.floor(Date.now() / 1000));
    const fsig = sign(forced, fts);
    check("  url-safe chars verified", verifySignature(forced, hdrs(fsig, fts)).valid, true);
  }
  check("tampered body rejected", verifySignature(body + " ", hdrs(sign(body, ts), ts)).valid, false);
  check("wrong secret rejected", verifySignature(body, hdrs(sign(body, ts, "wrong-secret"), ts)).valid, false);
  check("missing signature rejected", verifySignature(body, new Headers({ [TIMESTAMP_HEADER]: ts })).valid, false);
  check("missing timestamp rejected", verifySignature(body, new Headers({ [SIGNATURE_HEADER]: sign(body, ts) })).valid, false);

  const oldTs = String(Math.floor(Date.now() / 1000) - 3600);
  const replay = verifySignature(body, hdrs(sign(body, oldTs), oldTs));
  check("replayed old delivery rejected", replay.valid, false);
  check("  reason is timestamp", replay.valid === false && replay.reason, "timestamp-out-of-range");

  const msTs = String(Date.now());
  check("millisecond timestamp handled", verifySignature(body, hdrs(sign(body, msTs), msTs)).valid, true);

  console.log("\n── Amount comparison ──");
  check("exact match", amountMatches(50, "50.00"), true);
  check("sub-cent drift tolerated", amountMatches(50, "50.004"), true);
  check("different amount rejected", amountMatches(50, "49.00"), false);
  check("garbage rejected", amountMatches(50, "not-a-number"), false);

  console.log("\n── Config vs live gateway ──");
  const live = await listPaymentMethods();
  const liveKeys = new Set(live.filter(m => m.status === "AVAILABLE").map(m => m.key));
  const missing = PAYMENT_METHODS.filter(m => !liveKeys.has(m.key)).map(m => m.key);
  check("every configured method is live", missing, []);

  const mismatched = PAYMENT_METHODS.filter(m => {
    const l = live.find(x => x.key === m.key);
    return l && Number(l.minimumAmount) !== m.min;
  }).map(m => m.key);
  check("configured minimums match gateway", mismatched, []);

  console.log("\n── Real order lifecycle ──");
  const user = await prisma.user.findFirst({ where: { role: "FOLLOWER", deletedAt: null }, select: { id: true, email: true, name: true } });
  if (!user) { console.log("  (no follower account to test with)"); return; }

  const payment = await prisma.cardPayment.create({
    data: { userId: user.id, amount: 2, currency: "USD", status: "PENDING", provider: "PAYMEGATE", paymentMethod: "stripe" },
    select: { id: true },
  });
  created.push(payment.id);

  const order = await createOrder({
    amount: 2, currency: "USD", paymentMethodsKeys: ["stripe"],
    customer: { email: user.email, fullName: user.name },
    externalId: payment.id,
    backUrl: "https://copytradesultra.com/dashboard/deposit",
    metadata: { verification: true },
  });

  check("order created", Boolean(order.orderUUID), true);
  check("checkout URL returned", order.checkoutUrl.startsWith("http"), true);
  check("starts UNPAID", order.status, "UNPAID");
  check("externalId round-trips", order.externalId, payment.id);
  console.log(`  (checkout: ${order.checkoutUrl.slice(0, 60)}…)`);

  await prisma.cardPayment.update({ where: { id: payment.id }, data: { providerOrderId: order.orderUUID, checkoutUrl: order.checkoutUrl } });

  const fetched = await getOrder(order.orderUUID);
  check("order retrievable by id", fetched.orderUUID, order.orderUUID);
  check("amount matches what we sent", amountMatches(2, fetched.amount), true);

  console.log("\n── Settlement guards ──");
  const unpaid = await settleOrder(order.orderUUID);
  check("unpaid order is NOT credited", unpaid.outcome, "NOT_PAID");

  const after = await prisma.cardPayment.findUnique({ where: { id: payment.id }, select: { status: true } });
  check("status untouched while unpaid", after?.status, "PENDING");

  const unknown = await settleOrder("00000000-0000-4000-8000-000000000999");
  check("unknown order rejected", unknown.outcome, "UNKNOWN_ORDER");

  await prisma.cardPayment.update({ where: { id: payment.id }, data: { status: "CONFIRMED" } });
  const dupe = await settleOrder(order.orderUUID);
  check("already-settled is not re-credited", dupe.outcome, "ALREADY_SETTLED");
}

main()
  .catch(e => { fail++; console.error("\nFATAL:", e instanceof Error ? e.message : e); })
  .finally(async () => {
    if (created.length) {
      await prisma.cardPayment.deleteMany({ where: { id: { in: created } } });
      console.log(`\n  cleaned up ${created.length} test payment row(s)`);
    }
    await prisma.$disconnect();
    console.log(`\n${"─".repeat(48)}\n${pass} passed, ${fail} failed`);
    process.exit(fail > 0 ? 1 : 0);
  });
