import Link from "next/link";
import {
  DollarSign,
  Receipt as ReceiptIcon,
  ShieldCheck,
  RotateCcw,
  Plus,
} from "lucide-react";

import { getDashboardStats } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { CategoryBadge } from "@/components/category-badge";
import { DeadlineBadge } from "@/components/deadline-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Receipt } from "@/lib/types";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const now = new Date();
  const monthLabel = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="An overview of your spending, warranties and return windows."
      >
        <Button asChild>
          <Link href="/receipts/new">
            <Plus className="h-4 w-4" />
            Upload receipt
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Spending this month"
          value={formatCurrency(stats.monthSpend)}
          icon={DollarSign}
          hint={monthLabel}
        />
        <StatCard
          label="Total receipts"
          value={stats.totalReceipts}
          icon={ReceiptIcon}
        />
        <StatCard
          label="Upcoming warranties"
          value={stats.upcomingWarranties.length}
          icon={ShieldCheck}
        />
        <StatCard
          label="Upcoming returns"
          value={stats.upcomingReturns.length}
          icon={RotateCcw}
        />
      </div>

      {stats.totalReceipts === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={ReceiptIcon}
            title="No receipts yet"
            description="Upload your first receipt to start tracking spending, warranties and return windows."
            actionLabel="Upload a receipt"
            actionHref="/receipts/new"
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <DeadlineList
            title="Warranties expiring soon"
            description="Sorted by the next expiration date."
            href="/warranties"
            receipts={stats.upcomingWarranties}
            field="warranty_expiration"
            emptyText="No upcoming warranty expirations."
          />
          <DeadlineList
            title="Return windows closing"
            description="Items you can still return."
            href="/returns"
            receipts={stats.upcomingReturns}
            field="return_deadline"
            emptyText="No upcoming return deadlines."
          />

          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Recent receipts</CardTitle>
                <CardDescription>Your latest uploads.</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/receipts">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-1">
              {stats.recent.map((r) => (
                <Link
                  key={r.id}
                  href={`/receipts/${r.id}`}
                  className="flex items-center justify-between rounded-md px-2 py-3 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {r.merchant_name || "Untitled receipt"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.purchase_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <CategoryBadge category={r.category} />
                    <span className="w-20 text-right font-medium tabular-nums">
                      {formatCurrency(r.total_amount)}
                    </span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function DeadlineList({
  title,
  description,
  href,
  receipts,
  field,
  emptyText,
}: {
  title: string;
  description: string;
  href: string;
  receipts: Receipt[];
  field: "warranty_expiration" | "return_deadline";
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href={href}>View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {receipts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          <ul className="space-y-1">
            {receipts.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/receipts/${r.id}`}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent"
                >
                  <span className="min-w-0 truncate font-medium">
                    {r.merchant_name || "Untitled receipt"}
                  </span>
                  <DeadlineBadge date={r[field]} showDate={false} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
