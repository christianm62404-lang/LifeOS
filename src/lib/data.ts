import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Receipt, ReceiptItem, ReceiptWithItems } from "@/lib/types";

/** Returns the authenticated user or throws (callers run behind middleware). */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  return { supabase, user };
}

export interface ReceiptFilters {
  search?: string;
  category?: string;
}

/** Fetch the current user's receipts, newest first, with optional filters. */
export async function getReceipts(
  filters: ReceiptFilters = {},
): Promise<Receipt[]> {
  const { supabase, user } = await requireUser();

  let query = supabase
    .from("receipts")
    .select("*")
    .eq("user_id", user.id)
    .order("purchase_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filters.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    // Search across merchant, category, payment method and notes.
    query = query.or(
      [
        `merchant_name.ilike.${term}`,
        `category.ilike.${term}`,
        `payment_method.ilike.${term}`,
        `notes.ilike.${term}`,
      ].join(","),
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  let receipts = (data ?? []) as Receipt[];

  // When searching, also include receipts whose *items* match the term.
  if (filters.search) {
    const term = `%${filters.search}%`;
    const { data: itemMatches } = await supabase
      .from("receipt_items")
      .select("receipt_id, receipts!inner(user_id)")
      .ilike("name", term)
      .eq("receipts.user_id", user.id);

    const matchedIds = new Set(
      (itemMatches ?? []).map((m: { receipt_id: string }) => m.receipt_id),
    );
    const existingIds = new Set(receipts.map((r) => r.id));
    const missing = [...matchedIds].filter((id) => !existingIds.has(id));

    if (missing.length > 0) {
      const { data: extra } = await supabase
        .from("receipts")
        .select("*")
        .in("id", missing);
      receipts = [...receipts, ...((extra ?? []) as Receipt[])];
    }
  }

  return receipts;
}

/** Fetch a single receipt (with items) owned by the current user. */
export async function getReceipt(
  id: string,
): Promise<ReceiptWithItems | null> {
  const { supabase, user } = await requireUser();

  const { data: receipt, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!receipt) return null;

  const { data: items } = await supabase
    .from("receipt_items")
    .select("*")
    .eq("receipt_id", id)
    .order("created_at", { ascending: true });

  return { ...(receipt as Receipt), items: (items ?? []) as ReceiptItem[] };
}

export interface DashboardStats {
  monthSpend: number;
  totalReceipts: number;
  upcomingWarranties: Receipt[];
  upcomingReturns: Receipt[];
  recent: Receipt[];
}

/** Aggregate the figures shown on the dashboard. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { supabase, user } = await requireUser();
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const todayIso = today.toISOString().slice(0, 10);

  const [{ data: all }, { count }] = await Promise.all([
    supabase.from("receipts").select("*").eq("user_id", user.id),
    supabase
      .from("receipts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const receipts = (all ?? []) as Receipt[];

  const monthSpend = receipts
    .filter((r) => r.purchase_date && r.purchase_date >= startOfMonth)
    .reduce((sum, r) => sum + (r.total_amount ?? 0), 0);

  const upcomingWarranties = receipts
    .filter((r) => r.warranty_expiration && r.warranty_expiration >= todayIso)
    .sort((a, b) =>
      (a.warranty_expiration ?? "").localeCompare(b.warranty_expiration ?? ""),
    )
    .slice(0, 5);

  const upcomingReturns = receipts
    .filter((r) => r.return_deadline && r.return_deadline >= todayIso)
    .sort((a, b) =>
      (a.return_deadline ?? "").localeCompare(b.return_deadline ?? ""),
    )
    .slice(0, 5);

  const recent = [...receipts]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  return {
    monthSpend,
    totalReceipts: count ?? receipts.length,
    upcomingWarranties,
    upcomingReturns,
    recent,
  };
}

/** Receipts that have a warranty expiration date, soonest first. */
export async function getWarranties(): Promise<Receipt[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("user_id", user.id)
    .not("warranty_expiration", "is", null)
    .order("warranty_expiration", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Receipt[];
}

/** Receipts that have a return deadline, soonest first. */
export async function getReturns(): Promise<Receipt[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("user_id", user.id)
    .not("return_deadline", "is", null)
    .order("return_deadline", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Receipt[];
}
