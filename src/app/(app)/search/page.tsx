import type { Metadata } from "next";
import Link from "next/link";
import {
  Search as SearchIcon,
  Receipt,
  RefreshCw,
  FileText,
  BellRing,
  Target,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { labelize } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import type {
  Bill,
  Subscription,
  DocumentRecord,
  Reminder,
  Goal,
} from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Search — LifeOS" };

interface ResultItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

interface ResultGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
  items: ResultItem[];
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  let groups: ResultGroup[] = [];
  let total = 0;

  if (query) {
    const supabase = await createClient();
    const like = `%${query}%`;

    const [bills, subs, docs, reminders, goals] = await Promise.all([
      supabase
        .from("bills")
        .select("*")
        .or(`name.ilike.${like},notes.ilike.${like}`)
        .limit(10),
      supabase
        .from("subscriptions")
        .select("*")
        .or(`name.ilike.${like},notes.ilike.${like}`)
        .limit(10),
      supabase
        .from("documents")
        .select("*")
        .or(`title.ilike.${like},notes.ilike.${like}`)
        .limit(10),
      supabase
        .from("reminders")
        .select("*")
        .or(`title.ilike.${like},notes.ilike.${like}`)
        .limit(10),
      supabase
        .from("goals")
        .select("*")
        .or(`title.ilike.${like},notes.ilike.${like}`)
        .limit(10),
    ]);

    groups = [
      {
        key: "bills",
        label: "Bills",
        icon: Receipt,
        href: "/bills",
        items: ((bills.data ?? []) as Bill[]).map((b) => ({
          id: b.id,
          title: b.name,
          subtitle: `${formatCurrency(b.amount)} · due ${formatDate(b.due_date)}`,
          href: "/bills",
        })),
      },
      {
        key: "subscriptions",
        label: "Subscriptions",
        icon: RefreshCw,
        href: "/subscriptions",
        items: ((subs.data ?? []) as Subscription[]).map((s) => ({
          id: s.id,
          title: s.name,
          subtitle: `${formatCurrency(s.amount)} · ${labelize(s.billing_cycle)}`,
          href: "/subscriptions",
        })),
      },
      {
        key: "documents",
        label: "Documents",
        icon: FileText,
        href: "/documents",
        items: ((docs.data ?? []) as DocumentRecord[]).map((d) => ({
          id: d.id,
          title: d.title,
          subtitle: `${labelize(d.document_type)}${d.expiration_date ? ` · expires ${formatDate(d.expiration_date)}` : ""}`,
          href: "/documents",
        })),
      },
      {
        key: "reminders",
        label: "Reminders",
        icon: BellRing,
        href: "/reminders",
        items: ((reminders.data ?? []) as Reminder[]).map((r) => ({
          id: r.id,
          title: r.title,
          subtitle: `${labelize(r.priority)} priority · due ${formatDate(r.due_date)}`,
          href: "/reminders",
        })),
      },
      {
        key: "goals",
        label: "Goals",
        icon: Target,
        href: "/goals",
        items: ((goals.data ?? []) as Goal[]).map((g) => ({
          id: g.id,
          title: g.title,
          subtitle: `${labelize(g.category)} · ${g.progress}% complete`,
          href: "/goals",
        })),
      },
    ];

    total = groups.reduce((sum, g) => sum + g.items.length, 0);
  }

  return (
    <div>
      <PageHeader
        title="Search"
        description={
          query
            ? `${total} result${total === 1 ? "" : "s"} for “${query}”`
            : "Search across bills, subscriptions, documents, reminders and goals."
        }
      />

      {!query ? (
        <EmptyState
          icon={SearchIcon}
          title="Start typing to search"
          description="Use the search bar at the top to find anything across LifeOS."
        />
      ) : total === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No results found"
          description={`We couldn't find anything matching “${query}”.`}
        />
      ) : (
        <div className="space-y-6">
          {groups
            .filter((g) => g.items.length > 0)
            .map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.key}>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Icon className="h-4 w-4" /> {group.label}
                    <Badge variant="secondary">{group.items.length}</Badge>
                  </h2>
                  <Card>
                    <CardContent className="divide-y p-0">
                      {group.items.map((item) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/50"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.title}</p>
                            <p className="truncate text-sm text-muted-foreground">
                              {item.subtitle}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
