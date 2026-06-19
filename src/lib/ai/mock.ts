import type { ExtractedReceipt } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";

/** Sample merchants per category for believable mock data. */
const SAMPLES: Array<{
  merchant: string;
  category: (typeof CATEGORIES)[number];
  payment: string;
  items: Array<{ name: string; price: number; warranty_months: number }>;
}> = [
  {
    merchant: "Whole Foods Market",
    category: "Groceries",
    payment: "Visa •••• 4242",
    items: [
      { name: "Organic Bananas", price: 2.49, warranty_months: 0 },
      { name: "Almond Milk", price: 4.99, warranty_months: 0 },
      { name: "Sourdough Bread", price: 5.5, warranty_months: 0 },
    ],
  },
  {
    merchant: "Best Buy",
    category: "Electronics",
    payment: "Mastercard •••• 8810",
    items: [
      { name: "Wireless Headphones", price: 199.99, warranty_months: 12 },
      { name: "USB-C Cable", price: 19.99, warranty_months: 6 },
    ],
  },
  {
    merchant: "IKEA",
    category: "Home",
    payment: "Apple Pay",
    items: [
      { name: "Desk Lamp", price: 34.99, warranty_months: 24 },
      { name: "Storage Bins (set of 3)", price: 24.99, warranty_months: 0 },
    ],
  },
  {
    merchant: "Uniqlo",
    category: "Clothing",
    payment: "Amex •••• 1005",
    items: [
      { name: "Merino Sweater", price: 49.9, warranty_months: 0 },
      { name: "Chino Pants", price: 39.9, warranty_months: 0 },
    ],
  },
];

/** Simple deterministic hash so the same file name yields the same mock. */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Deterministic mock extractor. Generates plausible receipt data from the
 * file name so the UX is identical to the real AI path (manual edits expected).
 */
export function mockExtract(fileName: string): ExtractedReceipt {
  const sample = SAMPLES[hash(fileName) % SAMPLES.length];

  const purchase = new Date();
  purchase.setDate(purchase.getDate() - (hash(fileName) % 21)); // within last 3 weeks

  const total = Number(
    sample.items.reduce((sum, i) => sum + i.price, 0).toFixed(2),
  );

  // Return window: 30 days from purchase.
  const returnDeadline = new Date(purchase);
  returnDeadline.setDate(returnDeadline.getDate() + 30);

  // Warranty: longest item warranty from purchase date, if any.
  const maxWarranty = Math.max(0, ...sample.items.map((i) => i.warranty_months));
  let warrantyExpiration: string | null = null;
  if (maxWarranty > 0) {
    const w = new Date(purchase);
    w.setMonth(w.getMonth() + maxWarranty);
    warrantyExpiration = isoDate(w);
  }

  return {
    merchant_name: sample.merchant,
    purchase_date: isoDate(purchase),
    total_amount: total,
    category: sample.category,
    payment_method: sample.payment,
    warranty_expiration: warrantyExpiration,
    return_deadline: isoDate(returnDeadline),
    notes: "Auto-filled by mock extractor — please review and edit.",
    items: sample.items.map((i) => ({
      name: i.name,
      quantity: 1,
      price: i.price,
      warranty_months: i.warranty_months || null,
    })),
  };
}
