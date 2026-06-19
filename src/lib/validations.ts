import { z } from "zod";
import {
  BILLING_CYCLE_OPTIONS,
  BILL_CATEGORIES,
  DOCUMENT_TYPES,
  GOAL_CATEGORIES,
  GOAL_STATUSES,
  PRIORITY_OPTIONS,
  RECURRENCE_OPTIONS,
  SUBSCRIPTION_CATEGORIES,
} from "./constants";

/** Coerce empty strings to undefined so optional fields validate cleanly. */
const optionalString = z
  .string()
  .trim()
  .max(2000, "Too long")
  .optional()
  .or(z.literal("").transform(() => undefined));

const amount = z.coerce
  .number({ invalid_type_error: "Enter a valid amount" })
  .min(0, "Amount cannot be negative")
  .max(1_000_000, "Amount is too large");

const isoDate = z.string().min(1, "Date is required");

// ----------------------------- Auth -----------------------------

export const signUpSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().trim().min(1, "Name is required").max(120),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ----------------------------- Bill -----------------------------

export const billSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  amount,
  dueDate: isoDate,
  recurrence: z.enum(RECURRENCE_OPTIONS),
  autopay: z.coerce.boolean().default(false),
  category: z.enum(BILL_CATEGORIES),
  notes: optionalString,
});
export type BillInput = z.infer<typeof billSchema>;

// ------------------------- Subscription -------------------------

export const subscriptionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  amount,
  billingCycle: z.enum(BILLING_CYCLE_OPTIONS),
  nextBillingDate: isoDate,
  category: z.enum(SUBSCRIPTION_CATEGORIES),
  cancellationLink: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: optionalString,
});
export type SubscriptionInput = z.infer<typeof subscriptionSchema>;

// --------------------------- Document ---------------------------

export const documentSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  documentType: z.enum(DOCUMENT_TYPES),
  expirationDate: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: optionalString,
});
export type DocumentInput = z.infer<typeof documentSchema>;

// --------------------------- Reminder ---------------------------

export const reminderSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  dueDate: isoDate,
  recurrence: z.enum(RECURRENCE_OPTIONS),
  priority: z.enum(PRIORITY_OPTIONS),
  notes: optionalString,
});
export type ReminderInput = z.infer<typeof reminderSchema>;

// ----------------------------- Goal -----------------------------

export const goalSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  category: z.enum(GOAL_CATEGORIES),
  targetDate: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  status: z.enum(GOAL_STATUSES),
  notes: optionalString,
});
export type GoalInput = z.infer<typeof goalSchema>;
