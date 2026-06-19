import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  daysUntil,
  toDateInputValue,
  initials,
  relativeDeadline,
} from "./utils";

describe("formatCurrency", () => {
  it("formats numbers as USD", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("returns an em dash for nullish values", () => {
    expect(formatCurrency(null)).toBe("—");
    expect(formatCurrency(undefined)).toBe("—");
  });
});

describe("daysUntil", () => {
  it("returns 0 for today", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(daysUntil(today)).toBe(0);
  });

  it("returns a positive number for future dates", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    expect(daysUntil(future)).toBe(10);
  });

  it("returns a negative number for past dates", () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    expect(daysUntil(past)).toBe(-5);
  });

  it("returns null for nullish input", () => {
    expect(daysUntil(null)).toBeNull();
  });
});

describe("relativeDeadline", () => {
  it("labels today and tomorrow", () => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(relativeDeadline(today)).toBe("Today");
    expect(relativeDeadline(tomorrow)).toBe("Tomorrow");
  });
});

describe("toDateInputValue", () => {
  it("formats ISO dates to yyyy-MM-dd", () => {
    expect(toDateInputValue("2026-01-15T12:00:00Z")).toBe("2026-01-15");
  });

  it("returns empty string for nullish input", () => {
    expect(toDateInputValue(null)).toBe("");
  });
});

describe("initials", () => {
  it("derives initials from a full name", () => {
    expect(initials("Jane Doe")).toBe("JD");
  });

  it("derives initials from an email", () => {
    expect(initials("jane@example.com")).toBe("JE");
  });

  it("handles empty input", () => {
    expect(initials("")).toBe("?");
  });
});
