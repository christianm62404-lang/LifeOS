import { z } from "zod";
import { CATEGORIES } from "./categories";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    fullName: z.string().min(1, "Name is required").max(120),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type SignupValues = z.infer<typeof signupSchema>;

/** Optional ISO date string (yyyy-MM-dd) or empty. */
const optionalDate = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

const optionalText = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

export const receiptItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Item name is required"),
  quantity: z.coerce.number().int().min(1).default(1),
  price: z.coerce.number().min(0).nullable().optional(),
  warranty_months: z.coerce.number().int().min(0).nullable().optional(),
});
export type ReceiptItemValues = z.infer<typeof receiptItemSchema>;

export const receiptSchema = z.object({
  merchant_name: z.string().min(1, "Merchant name is required").max(200),
  purchase_date: optionalDate,
  total_amount: z.coerce
    .number({ invalid_type_error: "Enter a valid amount" })
    .min(0, "Amount cannot be negative")
    .nullable()
    .optional(),
  category: z.enum(CATEGORIES).default("Other"),
  payment_method: optionalText,
  warranty_expiration: optionalDate,
  return_deadline: optionalDate,
  notes: optionalText,
  items: z.array(receiptItemSchema).default([]),
});
export type ReceiptValues = z.infer<typeof receiptSchema>;

export const profileSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(120),
});
export type ProfileValues = z.infer<typeof profileSchema>;
