/**
 * Enable Row Level Security on every table in the public schema.
 *
 * WHY: the Supabase anon key ships in the browser bundle. With RLS off, that
 * key can read and write every table directly through the PostgREST endpoint,
 * bypassing the application, its auth, and all enforcement built on top.
 *
 * WHY THIS IS SAFE FOR THE APP: Prisma connects as `postgres`, which both owns
 * these tables and carries rolbypassrls, so it is unaffected. We deliberately
 * do NOT use FORCE ROW LEVEL SECURITY — that would apply the policies to the
 * owner too and lock the application out.
 *
 * With RLS enabled and no policies defined, the default is deny-all for the
 * anon and authenticated roles. That is the intended posture: nothing in this
 * codebase queries tables through the Supabase client (it is used only for
 * Storage, which lives in a separate schema).
 *
 *   npx tsx scripts/enable-rls.ts          # apply
 *   npx tsx scripts/enable-rls.ts --check  # report only
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const checkOnly = process.argv.includes("--check");

async function main() {
  const guard = await prisma.$queryRawUnsafe<
    Array<{ current_user: string; bypasses_rls: boolean }>
  >(`SELECT current_user,
            (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS bypasses_rls`);

  const { current_user: role, bypasses_rls: bypasses } = guard[0];
  console.log(`Connected as ${role} (bypasses RLS: ${bypasses})`);

  // Refuse to proceed if enabling RLS would lock the application out.
  if (!bypasses) {
    console.error(
      `\nABORT: ${role} does not bypass RLS. Enabling it would break the app.`
    );
    process.exit(1);
  }

  const tables = await prisma.$queryRawUnsafe<
    Array<{ tablename: string; enabled: boolean }>
  >(`SELECT c.relname AS tablename, c.relrowsecurity AS enabled
     FROM pg_class c
     JOIN pg_namespace ns ON ns.oid = c.relnamespace
     WHERE ns.nspname = 'public' AND c.relkind = 'r'
     ORDER BY c.relname`);

  const pending = tables.filter((t) => !t.enabled);
  console.log(`${tables.length} tables, ${pending.length} without RLS\n`);

  if (pending.length === 0) {
    console.log("Nothing to do — RLS already enabled everywhere.");
    return;
  }

  if (checkOnly) {
    for (const t of pending) console.log(`  would enable: ${t.tablename}`);
    return;
  }

  let done = 0;
  for (const t of pending) {
    // Identifier is sourced from pg_class, not user input, and is quoted.
    await prisma.$executeRawUnsafe(
      `ALTER TABLE public."${t.tablename}" ENABLE ROW LEVEL SECURITY`
    );
    done++;
  }

  const after = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT count(*) AS n FROM pg_class c
     JOIN pg_namespace ns ON ns.oid = c.relnamespace
     WHERE ns.nspname='public' AND c.relkind='r' AND c.relrowsecurity = false`);

  console.log(`Enabled RLS on ${done} tables.`);
  console.log(`Tables still without RLS: ${Number(after[0].n)}`);
}

main()
  .catch((e) => {
    console.error("FAILED:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
