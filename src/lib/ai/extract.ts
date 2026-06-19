import "server-only";
import type { ExtractedReceipt } from "@/lib/types";
import { CATEGORIES, DEFAULT_CATEGORY } from "@/lib/categories";
import { mockExtract } from "./mock";

export interface ExtractInput {
  fileName: string;
  fileType: string;
  /** Base64 encoded file contents (used for real AI vision calls). */
  base64?: string;
}

export interface ExtractResult {
  data: ExtractedReceipt;
  /** "ai" when a real model was used, "mock" for the deterministic fallback. */
  source: "ai" | "mock";
}

const SYSTEM_PROMPT = `You are a receipt parsing assistant. Extract structured data from the receipt.
Return ONLY valid JSON matching this TypeScript type:
{
  "merchant_name": string | null,
  "purchase_date": string | null,        // ISO yyyy-MM-dd
  "total_amount": number | null,
  "category": one of ${JSON.stringify(CATEGORIES)},
  "payment_method": string | null,
  "warranty_expiration": string | null,  // ISO yyyy-MM-dd
  "return_deadline": string | null,      // ISO yyyy-MM-dd
  "notes": string | null,
  "items": [{ "name": string, "quantity": number, "price": number | null, "warranty_months": number | null }]
}`;

/**
 * Extract receipt data. Uses an OpenAI-compatible model when OPENAI_API_KEY
 * is present, otherwise falls back to a deterministic mock so the app runs
 * with zero paid dependencies.
 */
export async function extractReceipt(input: ExtractInput): Promise<ExtractResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { data: mockExtract(input.fileName), source: "mock" };
  }

  try {
    // Lazy import so the SDK is never required when running in mock mode.
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });

    const isImage = input.fileType.startsWith("image/");
    const userContent: Array<Record<string, unknown>> = [
      { type: "text", text: `Parse this receipt. File name: ${input.fileName}` },
    ];
    if (isImage && input.base64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${input.fileType};base64,${input.base64}` },
      });
    }

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent as never },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty AI response");

    return { data: normalize(JSON.parse(raw)), source: "ai" };
  } catch (err) {
    console.error("AI extraction failed, using mock:", err);
    return { data: mockExtract(input.fileName), source: "mock" };
  }
}

/** Coerce arbitrary parsed JSON into a safe ExtractedReceipt. */
export function normalize(raw: unknown): ExtractedReceipt {
  const r = (raw ?? {}) as Record<string, unknown>;
  const category =
    typeof r.category === "string" && (CATEGORIES as readonly string[]).includes(r.category)
      ? r.category
      : DEFAULT_CATEGORY;

  const items = Array.isArray(r.items)
    ? r.items.map((i) => {
        const item = (i ?? {}) as Record<string, unknown>;
        return {
          name: typeof item.name === "string" ? item.name : "Item",
          quantity: toNumber(item.quantity) ?? 1,
          price: toNumber(item.price),
          warranty_months: toNumber(item.warranty_months),
        };
      })
    : [];

  return {
    merchant_name: toStringOrNull(r.merchant_name),
    purchase_date: toStringOrNull(r.purchase_date),
    total_amount: toNumber(r.total_amount),
    category,
    payment_method: toStringOrNull(r.payment_method),
    warranty_expiration: toStringOrNull(r.warranty_expiration),
    return_deadline: toStringOrNull(r.return_deadline),
    notes: toStringOrNull(r.notes),
    items,
  };
}

function toStringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/[^0-9.-]/g, ""));
    return Number.isNaN(n) ? null : n;
  }
  return null;
}
