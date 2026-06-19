import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { hasFeature } from "@/lib/entitlements";
import { formatCurrency, relativeDueLabel } from "@/lib/utils";
import type { Bill, Subscription, DocumentRecord, Reminder } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { UpgradeGate } from "@/components/upgrade-gate";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Calendar — LifeOS" };

interface CalEvent {
  id: string;
  label: string;
  type: "Bill" | "Reminder" | "Subscription" | "Document";
  date: string;
  amount?: number;
}

const TYPE_VARIANT: Record<
  CalEvent["type"],
  "default" | "secondary" | "warning" | "outline"
> = {
  Bill: "default",
  Reminder: "secondary",
  Subscription: "outline",
  Document: "warning",
};

export default async function CalendarPage() {
  if (!(await hasFeature("calendar"))) {
    return (
      <div>
        <PageHeader
          title="Calendar"
          description="See bills, reminders, renewals and expiries on a timeline."
        />
        <UpgradeGate feature="calendar" />
      </div>
    );
  }

  const supabase = await createClient();
  const [billsRes, subsRes, docsRes, remindersRes] = await Promise.all([
    supabase.from("bills").select("*").eq("is_paid", false),
    supabase.from("subscriptions").select("*").eq("is_active", true),
    supabase.from("documents").select("*").not("expiration_date", "is", null),
    supabase.from("reminders").select("*").eq("is_complete", false),
  ]);

  const events: CalEvent[] = [];
  for (const b of (billsRes.data ?? []) as Bill[]) {
    events.push({ id: `b-${b.id}`, label: b.name, type: "Bill", date: b.due_date, amount: b.amount });
  }
  for (const s of (subsRes.data ?? []) as Subscription[]) {
    events.push({ id: `s-${s.id}`, label: `${s.name} renews`, type: "Subscription", date: s.next_billing_date, amount: s.amount });
  }
  for (const d of (docsRes.data ?? []) as DocumentRecord[]) {
    if (d.expiration_date)
      events.push({ id: `d-${d.id}`, label: `${d.title} expires`, type: "Document", date: d.expiration_date });
  }
  for (const r of (remindersRes.data ?? []) as Reminder[]) {
    events.push({ id: `r-${r.id}`, label: r.title, type: "Reminder", date: r.due_date });
  }

  events.sort((a, b) => a.date.localeCompare(b.date));

  // Group by year-month for a simple, robust agenda calendar.
  const groups = new Map<string, CalEvent[]>();
  for (const e of events) {
    const key = e.date.slice(0, 7); // YYYY-MM
    const arr = groups.get(key) ?? [];
    arr.push(e);
    groups.set(key, arr);
  }

  function monthLabel(key: string): string {
    const [y, m] = key.split("-").map(Number);
    return new Date(y as number, (m as number) - 1, 1).toLocaleDateString(
      "en-US",
      { month: "long", year: "numeric" },
    );
  }

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Everything with a date, laid out as an agenda you can scan at a glance."
      />

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing scheduled"
          description="Add bills, reminders, subscriptions or documents with dates to see them here."
        />
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([key, evts]) => (
            <div key={key}>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
                {monthLabel(key)}
              </h2>
              <Card>
                <CardContent className="divide-y p-0">
                  {evts.map((e) => {
                    const day = new Date(e.date);
                    return (
                      <div
                        key={e.id}
                        className="flex items-center gap-4 px-4 py-3"
                      >
                        <div className="flex w-12 shrink-0 flex-col items-center rounded-md border bg-muted/40 py-1">
                          <span className="text-[10px] uppercase text-muted-foreground">
                            {day.toLocaleDateString("en-US", {
                              weekday: "short",
                            })}
                          </span>
                          <span className="text-base font-semibold leading-none">
                            {day.getUTCDate()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {e.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {relativeDueLabel(e.date)}
                          </p>
                        </div>
                        {e.amount !== undefined && (
                          <span className="text-sm tabular-nums">
                            {formatCurrency(e.amount)}
                          </span>
                        )}
                        <Badge variant={TYPE_VARIANT[e.type]}>{e.type}</Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
