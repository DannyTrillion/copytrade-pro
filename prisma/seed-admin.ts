import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "tradingview@gmail.com";
  const password = "Ayobamii2006$";
  const name = "Admin";

  const passwordHash = await hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      passwordHash,
      role: "ADMIN",
    },
    update: {
      passwordHash,
      role: "ADMIN",
      name,
    },
  });

  // Ensure balance record exists
  await prisma.balance.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

  console.log(`Admin account ready: ${email} (id: ${user.id})`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
