/**
 * Application domain types. These mirror the database schema in
 * `supabase/schema.sql`. Columns use snake_case to match Postgres.
 */

export type FileType = "pdf" | "png" | "jpg" | "jpeg";

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  name: string;
  quantity: number;
  price: number | null;
  warranty_months: number | null;
  created_at: string;
}

export interface Receipt {
  id: string;
  user_id: string;
  merchant_name: string | null;
  purchase_date: string | null; // ISO date (yyyy-MM-dd)
  total_amount: number | null;
  category: string | null;
  payment_method: string | null;
  file_url: string | null; // storage object path
  file_type: string | null;
  warranty_expiration: string | null; // ISO date
  return_deadline: string | null; // ISO date
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReceiptWithItems extends Receipt {
  items: ReceiptItem[];
}

export interface Profile {
  id: string; // matches auth.users.id
  email: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

/** Shape returned by the AI / mock extractor before persistence. */
export interface ExtractedReceipt {
  merchant_name: string | null;
  purchase_date: string | null;
  total_amount: number | null;
  category: string | null;
  payment_method: string | null;
  warranty_expiration: string | null;
  return_deadline: string | null;
  notes: string | null;
  items: ExtractedItem[];
}

export interface ExtractedItem {
  name: string;
  quantity: number;
  price: number | null;
  warranty_months: number | null;
}
