import type { Metadata } from "next";
import { CalendarClock, Layers, RefreshCw, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CYCLE_TO_MONTHLY } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { Subscription } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { SubscriptionDialog } from "./subscription-dialog";
import { SubscriptionsList } from "./subscriptions-list";

export const metadata: Metadata = { title: "Subscriptions — LifeOS" };

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .order("is_active", { ascending: false })
    .order("next_billing_date", { ascending: true });

  const subscriptions = (data ?? []) as Subscription[];

  const monthlyTotal = subscriptions
    .filter((s) => s.is_active)
    .reduce(
      (sum, s) => sum + s.amount * (CYCLE_TO_MONTHLY[s.billing_cycle] || 0),
      0,
    );
  const yearlyTotal = monthlyTotal * 12;
  const activeCount = subscriptions.filter((s) => s.is_active).length;

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        description="Track recurring subscriptions and what they cost each month."
      >
        <SubscriptionDialog />
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Monthly total"
          value={formatCurrency(monthlyTotal)}
          icon={Wallet}
          hint="Active subscriptions"
        />
        <StatCard
          label="Yearly total"
          value={formatCurrency(yearlyTotal)}
          icon={CalendarClock}
        />
        <StatCard
          label="Active"
          value={activeCount}
          icon={RefreshCw}
          accent="success"
        />
        <StatCard
          label="Total tracked"
          value={subscriptions.length}
          icon={Layers}
        />
      </div>

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="No subscriptions yet"
          description="Add your first subscription to start tracking recurring costs."
        >
          <SubscriptionDialog />
        </EmptyState>
      ) : (
        <SubscriptionsList subscriptions={subscriptions} />
      )}
    </div>
  );
}
