/**
 * Shared option sets used across forms, filters and validation.
 * Keeping these in one place keeps the Zod enums and the UI selects in sync.
 */

export const RECURRENCE_OPTIONS = [
  "none",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "semiannually",
  "yearly",
] as const;
export type Recurrence = (typeof RECURRENCE_OPTIONS)[number];

export const BILL_CATEGORIES = [
  "housing",
  "utilities",
  "insurance",
  "loan",
  "credit-card",
  "phone",
  "internet",
  "medical",
  "other",
] as const;
export type BillCategory = (typeof BILL_CATEGORIES)[number];

export const BILLING_CYCLE_OPTIONS = [
  "weekly",
  "monthly",
  "quarterly",
  "semiannually",
  "yearly",
] as const;
export type BillingCycle = (typeof BILLING_CYCLE_OPTIONS)[number];

export const SUBSCRIPTION_CATEGORIES = [
  "streaming",
  "music",
  "software",
  "gaming",
  "news",
  "fitness",
  "cloud",
  "other",
] as const;
export type SubscriptionCategory = (typeof SUBSCRIPTION_CATEGORIES)[number];

export const DOCUMENT_TYPES = [
  "insurance",
  "license",
  "passport",
  "lease",
  "warranty",
  "medical",
  "tax",
  "other",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const PRIORITY_OPTIONS = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITY_OPTIONS)[number];

export const GOAL_CATEGORIES = [
  "finance",
  "health",
  "career",
  "school",
  "personal",
] as const;
export type GoalCategory = (typeof GOAL_CATEGORIES)[number];

export const GOAL_STATUSES = [
  "not-started",
  "in-progress",
  "completed",
  "on-hold",
] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

/** Multiplier to normalise a billing cycle / recurrence into a monthly figure. */
export const CYCLE_TO_MONTHLY: Record<BillingCycle, number> = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  semiannually: 1 / 6,
  yearly: 1 / 12,
};

export const RECURRENCE_TO_MONTHLY: Record<Recurrence, number> = {
  none: 0,
  weekly: 52 / 12,
  biweekly: 26 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  semiannually: 1 / 6,
  yearly: 1 / 12,
};

/** Convert an enum-ish slug to a human readable label. */
export function labelize(value: string): string {
  return value
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
