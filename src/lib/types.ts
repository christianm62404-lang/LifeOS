import type {
  BillCategory,
  BillingCycle,
  DocumentType,
  GoalCategory,
  GoalStatus,
  Priority,
  Recurrence,
  SubscriptionCategory,
} from "./constants";

/**
 * Row shapes returned from Supabase. These mirror the SQL schema in
 * `supabase/migrations`. Columns are snake_case to match Postgres.
 */

export interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date: string; // ISO date
  recurrence: Recurrence;
  autopay: boolean;
  category: BillCategory;
  notes: string | null;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  billing_cycle: BillingCycle;
  next_billing_date: string;
  category: SubscriptionCategory;
  cancellation_link: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  user_id: string;
  title: string;
  document_type: DocumentType;
  expiration_date: string | null;
  notes: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  due_date: string;
  recurrence: Recurrence;
  priority: Priority;
  notes: string | null;
  is_complete: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  category: GoalCategory;
  target_date: string | null;
  progress: number; // 0 - 100
  status: GoalStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ActivityEntity =
  | "bill"
  | "subscription"
  | "document"
  | "reminder"
  | "goal";

export interface ActivityLog {
  id: string;
  user_id: string;
  entity_type: ActivityEntity;
  entity_id: string | null;
  action: string;
  description: string;
  created_at: string;
}

/** Standard result returned by server actions. */
export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };
