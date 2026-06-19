import type { Metadata } from "next";
import { Receipt, AlertTriangle, CalendarClock, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RECURRENCE_TO_MONTHLY } from "@/lib/constants";
import { formatCurrency, daysUntil } from "@/lib/utils";
import type { Bill } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { UpgradeGate } from "@/components/upgrade-gate";
import { hasFeature } from "@/lib/entitlements";
import { BillDialog } from "./bill-dialog";
import { BillsList } from "./bills-list";

export const metadata: Metadata = { title: "Bills — LifeOS" };

export default async function BillsPage() {
  if (!(await hasFeature("bills"))) {
    return (
      <div>
        <PageHeader
          title="Bills"
          description="Track due dates, recurrence and autopay across every bill."
        />
        <UpgradeGate feature="bills" />
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("bills")
    .select("*")
    .order("is_paid", { ascending: true })
    .order("due_date", { ascending: true });

  const bills = (data ?? []) as Bill[];

  const monthlyTotal = bills
    .filter((b) => !b.is_paid)
    .reduce(
      (sum, b) => sum + b.amount * (RECURRENCE_TO_MONTHLY[b.recurrence] || 0),
      0,
    );
  const overdueCount = bills.filter(
    (b) => !b.is_paid && (daysUntil(b.due_date) ?? 0) < 0,
  ).length;
  const dueSoonCount = bills.filter((b) => {
    const d = daysUntil(b.due_date);
    return !b.is_paid && d !== null && d >= 0 && d <= 7;
  }).length;
  const unpaidTotal = bills
    .filter((b) => !b.is_paid)
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <div>
      <PageHeader
        title="Bills"
        description="Track due dates, recurrence and autopay across every bill."
      >
        <BillDialog />
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Est. monthly bills"
          value={formatCurrency(monthlyTotal)}
          icon={Wallet}
          hint="Normalised by recurrence"
        />
        <StatCard
          label="Outstanding total"
          value={formatCurrency(unpaidTotal)}
          icon={Receipt}
          hint="Across unpaid bills"
        />
        <StatCard
          label="Due within 7 days"
          value={dueSoonCount}
          icon={CalendarClock}
          accent="warning"
        />
        <StatCard
          label="Overdue"
          value={overdueCount}
          icon={AlertTriangle}
          accent="destructive"
        />
      </div>

      {bills.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No bills yet"
          description="Add your first bill to start tracking due dates and monthly costs."
        >
          <BillDialog />
        </EmptyState>
      ) : (
        <BillsList bills={bills} />
      )}
    </div>
  );
}
