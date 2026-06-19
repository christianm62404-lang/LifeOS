import type { Metadata } from "next";
import { Target, CheckCircle2, TrendingUp, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { daysUntil } from "@/lib/utils";
import type { Goal } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { GoalDialog } from "./goal-dialog";
import { GoalsList } from "./goals-list";

export const metadata: Metadata = { title: "Goals — LifeOS" };

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });

  const goals = (data ?? []) as Goal[];

  const activeCount = goals.filter((g) => g.status !== "completed").length;
  const completedCount = goals.filter((g) => g.status === "completed").length;
  const avgProgress =
    goals.length === 0
      ? 0
      : Math.round(
          goals.reduce((sum, g) => sum + g.progress, 0) / goals.length,
        );
  const dueSoonCount = goals.filter((g) => {
    if (!g.target_date || g.status === "completed") return false;
    const d = daysUntil(g.target_date);
    return d !== null && d >= 0 && d <= 30;
  }).length;

  return (
    <div>
      <PageHeader
        title="Goals"
        description="Set measurable goals across finance, health, career, school and personal life."
      >
        <GoalDialog />
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active goals" value={activeCount} icon={Target} />
        <StatCard
          label="Completed"
          value={completedCount}
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label="Avg progress"
          value={`${avgProgress}%`}
          icon={TrendingUp}
        />
        <StatCard
          label="Due within 30 days"
          value={dueSoonCount}
          icon={CalendarClock}
          accent="warning"
        />
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Add your first goal to start tracking measurable progress."
        >
          <GoalDialog />
        </EmptyState>
      ) : (
        <GoalsList goals={goals} />
      )}
    </div>
  );
}
