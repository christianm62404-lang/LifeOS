import type { Metadata } from "next";
import Link from "next/link";
import {
  Wallet,
  RefreshCw,
  AlertTriangle,
  FileWarning,
  Target,
  Receipt,
  BellRing,
  ArrowRight,
  CalendarDays,
  Activity as ActivityIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  RECURRENCE_TO_MONTHLY,
  CYCLE_TO_MONTHLY,
  labelize,
} from "@/lib/constants";
import {
  formatCurrency,
  formatDate,
  daysUntil,
  relativeDueLabel,
} from "@/lib/utils";
import type {
  Bill,
  Subscription,
  DocumentRecord,
  Reminder,
  Goal,
  ActivityLog,
} from "@/lib/types";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard — LifeOS" };

interface UpcomingItem {
  id: string;
  label: string;
  type: string;
  date: string;
  amount?: number;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [billsRes, subsRes, docsRes, remindersRes, goalsRes, activityRes] =
    await Promise.all([
      supabase.from("bills").select("*"),
      supabase.from("subscriptions").select("*"),
      supabase.from("documents").select("*"),
      supabase.from("reminders").select("*"),
      supabase.from("goals").select("*"),
      supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const bills = (billsRes.data ?? []) as Bill[];
  const subscriptions = (subsRes.data ?? []) as Subscription[];
  const documents = (docsRes.data ?? []) as DocumentRecord[];
  const reminders = (remindersRes.data ?? []) as Reminder[];
  const goals = (goalsRes.data ?? []) as Goal[];
  const activity = (activityRes.data ?? []) as ActivityLog[];

  const firstName =
    ((user?.user_metadata?.full_name as string | undefined) ?? "").split(
      " ",
    )[0] || "there";

  // ---- Metrics ----
  const monthlyBills = bills
    .filter((b) => !b.is_paid)
    .reduce(
      (sum, b) => sum + b.amount * (RECURRENCE_TO_MONTHLY[b.recurrence] || 0),
      0,
    );
  const monthlySubs = subscriptions
    .filter((s) => s.is_active)
    .reduce(
      (sum, s) => sum + s.amount * (CYCLE_TO_MONTHLY[s.billing_cycle] || 0),
      0,
    );
  const overdueBills = bills.filter(
    (b) => !b.is_paid && (daysUntil(b.due_date) ?? 0) < 0,
  ).length;
  const overdueReminders = reminders.filter(
    (r) => !r.is_complete && (daysUntil(r.due_date) ?? 0) < 0,
  ).length;
  const overdueCount = overdueBills + overdueReminders;
  const expiringDocs = documents.filter((d) => {
    const days = daysUntil(d.expiration_date);
    return days !== null && days >= 0 && days <= 30;
  }).length;
  const activeGoals = goals.filter((g) => g.status !== "completed").length;

  // ---- Section lists ----
  const upcomingBills = bills
    .filter((b) => !b.is_paid)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5);
  const upcomingReminders = reminders
    .filter((r) => !r.is_complete)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5);
  const expiringDocuments = documents
    .filter((d) => d.expiration_date)
    .sort((a, b) => (a.expiration_date ?? "").localeCompare(b.expiration_date ?? ""))
    .slice(0, 5);
  const activeSubscriptions = subscriptions
    .filter((s) => s.is_active)
    .sort((a, b) => a.next_billing_date.localeCompare(b.next_billing_date))
    .slice(0, 5);
  const incompleteGoals = goals
    .filter((g) => g.status !== "completed")
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 4);

  // ---- Combined "Upcoming" calendar feed (next 30 days) ----
  const upcoming: UpcomingItem[] = [];
  for (const b of bills.filter((b) => !b.is_paid)) {
    upcoming.push({
      id: `bill-${b.id}`,
      label: b.name,
      type: "Bill",
      date: b.due_date,
      amount: b.amount,
    });
  }
  for (const r of reminders.filter((r) => !r.is_complete)) {
    upcoming.push({
      id: `reminder-${r.id}`,
      label: r.title,
      type: "Reminder",
      date: r.due_date,
    });
  }
  for (const s of subscriptions.filter((s) => s.is_active)) {
    upcoming.push({
      id: `sub-${s.id}`,
      label: `${s.name} renews`,
      type: "Subscription",
      date: s.next_billing_date,
      amount: s.amount,
    });
  }
  for (const d of documents.filter((d) => d.expiration_date)) {
    upcoming.push({
      id: `doc-${d.id}`,
      label: `${d.title} expires`,
      type: "Document",
      date: d.expiration_date as string,
    });
  }
  const upcomingFeed = upcoming
    .filter((u) => {
      const days = daysUntil(u.date);
      return days !== null && days >= 0 && days <= 30;
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what needs your attention.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Monthly bills"
          value={formatCurrency(monthlyBills)}
          icon={Wallet}
        />
        <StatCard
          label="Monthly subscriptions"
          value={formatCurrency(monthlySubs)}
          icon={RefreshCw}
        />
        <StatCard
          label="Overdue items"
          value={overdueCount}
          icon={AlertTriangle}
          accent={overdueCount > 0 ? "destructive" : "default"}
        />
        <StatCard
          label="Docs expiring (30d)"
          value={expiringDocs}
          icon={FileWarning}
          accent={expiringDocs > 0 ? "warning" : "default"}
        />
        <StatCard label="Active goals" value={activeGoals} icon={Target} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming calendar feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" /> Upcoming (next 30 days)
            </CardTitle>
            <CardDescription>
              Bills, reminders, renewals and expiries on the horizon.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingFeed.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nothing due in the next 30 days. You&apos;re all caught up.
              </p>
            ) : (
              <ul className="space-y-1">
                {upcomingFeed.map((item) => {
                  const days = daysUntil(item.date);
                  const soon = days !== null && days <= 3;
                  return (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-accent/50"
                    >
                      <div className="flex w-12 shrink-0 flex-col items-center rounded-md border bg-muted/40 py-1">
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {new Date(item.date).toLocaleDateString("en-US", {
                            month: "short",
                          })}
                        </span>
                        <span className="text-base font-semibold leading-none">
                          {new Date(item.date).getUTCDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.type} · {relativeDueLabel(item.date)}
                        </p>
                      </div>
                      {item.amount !== undefined && (
                        <span className="text-sm font-medium tabular-nums">
                          {formatCurrency(item.amount)}
                        </span>
                      )}
                      {soon && <Badge variant="warning">Soon</Badge>}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5" /> Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No activity yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <p className="truncate">{a.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(a.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Upcoming bills"
          href="/bills"
          icon={<Receipt className="h-5 w-5" />}
          empty={upcomingBills.length === 0}
          emptyText="No unpaid bills."
        >
          {upcomingBills.map((b) => (
            <Row
              key={b.id}
              label={b.name}
              sub={`${formatDate(b.due_date)} · ${relativeDueLabel(b.due_date)}`}
              right={formatCurrency(b.amount)}
              danger={(daysUntil(b.due_date) ?? 0) < 0}
            />
          ))}
        </SectionCard>

        <SectionCard
          title="Upcoming reminders"
          href="/reminders"
          icon={<BellRing className="h-5 w-5" />}
          empty={upcomingReminders.length === 0}
          emptyText="No open reminders."
        >
          {upcomingReminders.map((r) => (
            <Row
              key={r.id}
              label={r.title}
              sub={`${formatDate(r.due_date)} · ${relativeDueLabel(r.due_date)}`}
              right={labelize(r.priority)}
              danger={(daysUntil(r.due_date) ?? 0) < 0}
            />
          ))}
        </SectionCard>

        <SectionCard
          title="Expiring documents"
          href="/documents"
          icon={<FileWarning className="h-5 w-5" />}
          empty={expiringDocuments.length === 0}
          emptyText="No documents with expiry dates."
        >
          {expiringDocuments.map((d) => (
            <Row
              key={d.id}
              label={d.title}
              sub={`Expires ${formatDate(d.expiration_date)} · ${relativeDueLabel(d.expiration_date)}`}
              right={labelize(d.document_type)}
              danger={(daysUntil(d.expiration_date) ?? 99) < 0}
            />
          ))}
        </SectionCard>

        <SectionCard
          title="Active subscriptions"
          href="/subscriptions"
          icon={<RefreshCw className="h-5 w-5" />}
          empty={activeSubscriptions.length === 0}
          emptyText="No active subscriptions."
        >
          {activeSubscriptions.map((s) => (
            <Row
              key={s.id}
              label={s.name}
              sub={`Renews ${formatDate(s.next_billing_date)}`}
              right={`${formatCurrency(s.amount)}/${s.billing_cycle === "monthly" ? "mo" : s.billing_cycle === "yearly" ? "yr" : s.billing_cycle}`}
            />
          ))}
        </SectionCard>
      </div>

      {/* Incomplete goals */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" /> Goals in progress
          </CardTitle>
          <Link
            href="/goals"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {incompleteGoals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No goals in progress"
              description="Set a goal to start tracking your progress."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {incompleteGoals.map((g) => (
                <div key={g.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{g.title}</p>
                    <Badge variant="outline">{labelize(g.category)}</Badge>
                  </div>
                  <Progress value={g.progress} />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {g.progress}% ·{" "}
                    {g.target_date
                      ? `Target ${formatDate(g.target_date)}`
                      : "No target date"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SectionCard({
  title,
  href,
  icon,
  empty,
  emptyText,
  children,
}: {
  title: string;
  href: string;
  icon: React.ReactNode;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon} {title}
        </CardTitle>
        <Link
          href={href}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          <div className="divide-y">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  sub,
  right,
  danger,
}: {
  label: string;
  sub: string;
  right: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
      <span
        className={`shrink-0 text-sm ${danger ? "font-medium text-destructive" : "text-muted-foreground"}`}
      >
        {right}
      </span>
    </div>
  );
}
