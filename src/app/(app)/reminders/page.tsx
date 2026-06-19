import type { Metadata } from "next";
import { BellRing, AlertTriangle, CalendarClock, Flag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { daysUntil } from "@/lib/utils";
import type { Reminder } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { ReminderDialog } from "./reminder-dialog";
import { RemindersList } from "./reminders-list";

export const metadata: Metadata = { title: "Reminders — LifeOS" };

export default async function RemindersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reminders")
    .select("*")
    .order("is_complete", { ascending: true })
    .order("due_date", { ascending: true });

  const reminders = (data ?? []) as Reminder[];

  const openCount = reminders.filter((r) => !r.is_complete).length;
  const overdueCount = reminders.filter(
    (r) => !r.is_complete && (daysUntil(r.due_date) ?? 0) < 0,
  ).length;
  const dueSoonCount = reminders.filter((r) => {
    const d = daysUntil(r.due_date);
    return !r.is_complete && d !== null && d >= 0 && d <= 3;
  }).length;
  const highPriorityCount = reminders.filter(
    (r) => !r.is_complete && r.priority === "high",
  ).length;

  return (
    <div>
      <PageHeader
        title="Reminders"
        description="Stay on top of recurring tasks like filters, registration and backups."
      >
        <ReminderDialog />
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open reminders" value={openCount} icon={BellRing} />
        <StatCard
          label="Due soon"
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
        <StatCard
          label="High priority"
          value={highPriorityCount}
          icon={Flag}
        />
      </div>

      {reminders.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="No reminders yet"
          description="Add reminders for tasks like Replace air filter, Renew registration, Check smoke detectors or Back up laptop."
        >
          <ReminderDialog />
        </EmptyState>
      ) : (
        <RemindersList reminders={reminders} />
      )}
    </div>
  );
}
