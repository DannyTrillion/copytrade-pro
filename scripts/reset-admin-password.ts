import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const email = process.argv[2] || "admincopytrade@gmail.com";
  const newPassword = process.argv[3] || "Ayobamii2006$";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }
  if (user.role !== "ADMIN") {
    console.error(`Refusing to reset password — ${email} is role=${user.role}, not ADMIN`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, suspended: false, twoFactorEnabled: false, twoFactorSecret: null },
  });

  console.log(`\nPassword reset for ${email}`);
  console.log(`  · 2FA disabled`);
  console.log(`  · suspended cleared`);
  console.log(`  · new password (DO NOT SHARE): ${newPassword}\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
