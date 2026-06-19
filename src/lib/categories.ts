/** Default purchase categories used across the app. */
export const CATEGORIES = [
  "Groceries",
  "Electronics",
  "Clothing",
  "Home",
  "Auto",
  "Health",
  "Subscriptions",
  "Business",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const DEFAULT_CATEGORY: Category = "Other";

/** Tailwind badge classes per category for consistent colour coding. */
export const CATEGORY_COLORS: Record<Category, string> = {
  Groceries: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  Electronics: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Clothing: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  Home: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Auto: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
  Health: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  Subscriptions: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  Business: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  Other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

export function categoryColor(category: string | null | undefined): string {
  if (category && category in CATEGORY_COLORS) {
    return CATEGORY_COLORS[category as Category];
  }
  return CATEGORY_COLORS.Other;
}
