/**
 * Plan / tier definitions and the feature → minimum-tier map.
 * This module is safe to import on both the client and the server (no secrets).
 */

export const TIERS = ["free", "personal", "pro"] as const;
export type Tier = (typeof TIERS)[number];

/** Higher rank = more access. Used for "does tier X include feature Y" checks. */
export const TIER_RANK: Record<Tier, number> = {
  free: 0,
  personal: 1,
  pro: 2,
};

export type Feature =
  | "reminders"
  | "bills"
  | "documents"
  | "goals"
  | "calendar"
  | "subscriptions"
  | "smart-reminders"
  | "home-maintenance"
  | "vehicle-maintenance"
  | "ai-suggestions";

/** The minimum tier required to use each feature. */
export const FEATURE_MIN_TIER: Record<Feature, Tier> = {
  // Free
  reminders: "free",
  // Personal ($7.99)
  bills: "personal",
  documents: "personal",
  goals: "personal",
  calendar: "personal",
  // Pro ($14.99)
  subscriptions: "pro",
  "smart-reminders": "pro",
  "home-maintenance": "pro",
  "vehicle-maintenance": "pro",
  "ai-suggestions": "pro",
};

export const FEATURE_LABELS: Record<Feature, string> = {
  reminders: "Reminders",
  bills: "Bills",
  documents: "Documents",
  goals: "Goals",
  calendar: "Calendar",
  subscriptions: "Subscription tracking",
  "smart-reminders": "Smart recurring reminders",
  "home-maintenance": "Home maintenance",
  "vehicle-maintenance": "Vehicle maintenance",
  "ai-suggestions": "AI suggestions",
};

export function tierIncludesFeature(tier: Tier, feature: Feature): boolean {
  return TIER_RANK[tier] >= TIER_RANK[FEATURE_MIN_TIER[feature]];
}

export interface Plan {
  tier: Tier;
  name: string;
  priceLabel: string;
  priceMonthly: number;
  tagline: string;
  features: string[];
  highlighted?: boolean;
}

/** Marketing plan data for the pricing page. */
export const PLANS: Plan[] = [
  {
    tier: "free",
    name: "Free",
    priceLabel: "$0",
    priceMonthly: 0,
    tagline: "The essentials to stay organised.",
    features: ["Basic reminders", "Personal dashboard", "Global search"],
  },
  {
    tier: "personal",
    name: "Personal",
    priceLabel: "$7.99",
    priceMonthly: 7.99,
    tagline: "Everything you need to run day-to-day life.",
    highlighted: true,
    features: [
      "Everything in Free",
      "Bills & due-date tracking",
      "Documents & expiry alerts",
      "Goals",
      "Calendar view",
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    priceLabel: "$14.99",
    priceMonthly: 14.99,
    tagline: "Automate the busywork of adulting.",
    features: [
      "Everything in Personal",
      "Subscription tracking",
      "Smart recurring reminders",
      "Home maintenance",
      "Vehicle maintenance",
      "AI suggestions",
    ],
  },
];

export function tierLabel(tier: Tier): string {
  return { free: "Free", personal: "Personal", pro: "Pro" }[tier];
}
