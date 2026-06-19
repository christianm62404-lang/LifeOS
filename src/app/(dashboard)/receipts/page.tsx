import Link from "next/link";
import { Plus, Receipt as ReceiptIcon, SearchX } from "lucide-react";

import { getReceipts } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { ReceiptSearch } from "@/components/receipt-search";
import { ReceiptsTable } from "@/components/receipts-table";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const search = params.q?.trim() || undefined;
  const category = params.category || undefined;

  const receipts = await getReceipts({ search, category });
  const hasFilters = Boolean(search) || (category && category !== "all");

  return (
    <div>
      <PageHeader
        title="Receipts"
        description="Browse, search and manage all of your receipts."
      >
        <Button asChild>
          <Link href="/receipts/new">
            <Plus className="h-4 w-4" />
            Upload receipt
          </Link>
        </Button>
      </PageHeader>

      <div className="space-y-4">
        <ReceiptSearch />

        {receipts.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              title="No matching receipts"
              description="Try a different search term or clear your filters."
            />
          ) : (
            <EmptyState
              icon={ReceiptIcon}
              title="No receipts yet"
              description="Upload your first receipt to get started."
              actionLabel="Upload a receipt"
              actionHref="/receipts/new"
            />
          )
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {receipts.length} {receipts.length === 1 ? "receipt" : "receipts"}
            </p>
            <ReceiptsTable receipts={receipts} />
          </>
        )}
      </div>
    </div>
  );
}
