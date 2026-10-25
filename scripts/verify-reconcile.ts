/**
 * Verifies the deposit reconciliation sweep: which orders it touches, which it
 * leaves alone, and that it never credits without gateway confirmation.
 *   npx tsx scripts/verify-reconcile.ts
 */
import { PrismaClient } from "@prisma/client";
import { reconcilePendingDeposits } from "../src/lib/payments/reconcile";
import { settleOrder } from "../src/lib/payments/settlement";
import { ORDER_EXPIRY_MINUTES, RECONCILE_AFTER_MINUTES } from "../src/config/payments";

const prisma = new PrismaClient();
let pass = 0, fail = 0;
const check = (l: string, a: unknown, e: unknown) => {
  if (JSON.stringify(a) === JSON.stringify(e)) { pass++; console.log(`  ✓ ${l}`); }
  else { fail++; console.log(`  ✗ ${l}\n      expected: ${JSON.stringify(e)}\n      actual:   ${JSON.stringify(a)}`); }
};

const ids: string[] = [];

async function main() {
  const user = await prisma.user.findFirst({ where: { role: "FOLLOWER", deletedAt: null }, select: { id: true } });
  if (!user) { console.log("no follower account to test with"); return; }

  const mk = async (ageMin: number, orderId: string | null) => {
    const row = await prisma.cardPayment.create({
      data: {
        userId: user.id, amount: 2, currency: "USD", status: "PENDING",
        provider: "PAYMEGATE", paymentMethod: "stripe", providerOrderId: orderId,
        createdAt: new Date(Date.now() - ageMin * 60_000),
      }, select: { id: true },
    });
    ids.push(row.id);
    return row.id;
  };
  const statusOf = async (id: string) =>
    (await prisma.cardPayment.findUnique({ where: { id }, select: { status: true } }))?.status;

  console.log("\n── A 404 from the gateway is terminal, not transient ──");
  const ghostId = await mk(ORDER_EXPIRY_MINUTES + 30, "00000000-0000-4000-8000-0000000000aa");
  const ghost = await settleOrder("00000000-0000-4000-8000-0000000000aa");
  check("unknown-to-gateway reported distinctly", ghost.outcome, "ORDER_NOT_FOUND");

  console.log(`\n── Sweep windows (check after ${RECONCILE_AFTER_MINUTES}m, expire after ${ORDER_EXPIRY_MINUTES}m) ──`);
  const fresh  = await mk(1, "00000000-0000-4000-8000-0000000000bb");
  const middle = await mk(RECONCILE_AFTER_MINUTES + 5, "00000000-0000-4000-8000-0000000000cc");
  const orphan = await mk(ORDER_EXPIRY_MINUTES + 30, null);

  const before = await prisma.balance.findUnique({ where: { userId: user.id }, select: { totalBalance: true } });
  const summary = await reconcilePendingDeposits();
  const after = await prisma.balance.findUnique({ where: { userId: user.id }, select: { totalBalance: true } });
  console.log(`  summary: ${JSON.stringify(summary)}`);

  check("fresh order not touched", await statusOf(fresh), "PENDING");
  check("order with no gateway id skipped", await statusOf(orphan), "PENDING");
  check("stale ghost order expired", await statusOf(ghostId), "EXPIRED");
  check("mid-window order left pending", await statusOf(middle), "PENDING");

  console.log("\n── Safety ──");
  check("nothing credited", summary.credited, 0);
  check("balance unchanged", after?.totalBalance ?? 0, before?.totalBalance ?? 0);
  check("no balance transactions written", await prisma.balanceTransaction.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 120_000) } },
  }), 0);
  check("sweep reports the expiry", summary.expired, 1);
  check("sweep is idempotent", (await reconcilePendingDeposits()).credited, 0);
}

main().catch(e => { fail++; console.error("FATAL:", e instanceof Error ? e.message : e); })
  .finally(async () => {
    if (ids.length) await prisma.cardPayment.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
    console.log(`\n  cleaned up ${ids.length} rows\n${"─".repeat(46)}\n${pass} passed, ${fail} failed`);
    process.exit(fail > 0 ? 1 : 0);
  });
