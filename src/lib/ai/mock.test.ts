import { describe, it, expect } from "vitest";
import { mockExtract } from "./mock";
import { CATEGORIES } from "@/lib/categories";

describe("mockExtract", () => {
  it("returns a fully shaped receipt", () => {
    const result = mockExtract("best-buy-receipt.pdf");
    expect(result.merchant_name).toBeTruthy();
    expect(result.total_amount).toBeGreaterThan(0);
    expect(CATEGORIES).toContain(result.category);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.return_deadline).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("is deterministic for the same file name", () => {
    const a = mockExtract("groceries.png");
    const b = mockExtract("groceries.png");
    expect(a).toEqual(b);
  });

  it("computes total as the sum of item prices", () => {
    const result = mockExtract("ikea-order.jpg");
    const sum = Number(
      result.items.reduce((s, i) => s + (i.price ?? 0), 0).toFixed(2),
    );
    expect(result.total_amount).toBe(sum);
  });

  it("sets a warranty expiration only when an item has a warranty", () => {
    const result = mockExtract("electronics.jpg");
    const hasWarranty = result.items.some((i) => (i.warranty_months ?? 0) > 0);
    if (hasWarranty) {
      expect(result.warranty_expiration).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
