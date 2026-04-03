import { z } from "zod";

export const emailSchema = z.string().email("Please enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[0-9]/, "Include at least one number");

export const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name is too long");

export function amountSchema(min: number, max?: number) {
  let s = z.number().positive("Amount must be positive").min(min, `Minimum is $${min}`);
  if (max) s = s.max(max, `Maximum is $${max}`);
  return s;
}

export function validateField<T>(schema: z.ZodType<T>, value: unknown): string | undefined {
  const result = schema.safeParse(value);
  if (result.success) return undefined;
  return result.error.issues[0]?.message;
}
