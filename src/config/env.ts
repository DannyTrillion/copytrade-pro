import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(16),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  WEBHOOK_SECRET: z.string().min(16),
  POLYMARKET_API_URL: z.string().url().default("https://clob.polymarket.com"),
  POLYMARKET_API_KEY: z.string().default(""),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  ENCRYPTION_KEY: z.string().min(16),
  COMMISSION_RATE: z.string().default("0.02"),
  ADMIN_MASTER_KEY: z.string().min(8).optional(),
  RESEND_API_KEY: z.string().default(""),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
});

const PLACEHOLDER_VALUES = [
  "change-this-to-a-secure-random-string",
  "dev-secret-change-in-production",
  "your-tradingview-webhook-secret",
  "tv-webhook-secret",
  "32-char-encryption-key-change-me!",
];

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment variables:",
    parsed.error.flatten().fieldErrors
  );
  if (isProduction) {
    throw new Error("Missing required environment variables");
  }
}

export const env = parsed.success
  ? parsed.data
  : envSchema.parse({
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
      NEXTAUTH_SECRET:
        process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
      WEBHOOK_SECRET:
        process.env.WEBHOOK_SECRET || "tv-webhook-secret",
      ENCRYPTION_KEY:
        process.env.ENCRYPTION_KEY || "32-char-encryption-key-change-me!",
    });

// Warn about placeholder secrets
if (isProduction) {
  const secrets = {
    NEXTAUTH_SECRET: env.NEXTAUTH_SECRET,
    WEBHOOK_SECRET: env.WEBHOOK_SECRET,
    ENCRYPTION_KEY: env.ENCRYPTION_KEY,
  };

  for (const [key, value] of Object.entries(secrets)) {
    if (PLACEHOLDER_VALUES.includes(value)) {
      throw new Error(
        `${key} is set to a placeholder value. Generate a real secret before deploying.`
      );
    }
  }

  if (!env.RESEND_API_KEY) {
    console.warn(
      "RESEND_API_KEY is not set — email sending will fail in production"
    );
  }
}
