import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      suspended: true,
      createdAt: true,
      twoFactorEnabled: true,
    },
    orderBy: { createdAt: "asc" },
  });
  console.log(`\nFound ${admins.length} admin user(s):\n`);
  for (const a of admins) {
    console.log(`  · ${a.email}`);
    console.log(`      name=${a.name}  suspended=${a.suspended}  2FA=${a.twoFactorEnabled ?? false}`);
    console.log(`      created=${a.createdAt.toISOString()}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
