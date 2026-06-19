import { RotateCcw } from "lucide-react";

import { getReturns } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { DeadlineTable } from "@/components/deadline-table";
import { EmptyState } from "@/components/empty-state";
import { daysUntil } from "@/lib/utils";
import { SOON_THRESHOLD_DAYS } from "@/lib/constants";

export default async function ReturnsPage() {
  const receipts = await getReturns();
  const soonCount = receipts.filter((r) => {
    const d = daysUntil(r.return_deadline);
    return d !== null && d >= 0 && d <= SOON_THRESHOLD_DAYS;
  }).length;

  return (
    <div>
      <PageHeader
        title="Returns"
        description={
          receipts.length > 0
            ? `${receipts.length} tracked · ${soonCount} closing within ${SOON_THRESHOLD_DAYS} days`
            : "Keep an eye on return windows so you never miss a deadline."
        }
      />

      {receipts.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title="No return deadlines tracked"
          description="Add a return deadline to a receipt and it will appear here, sorted by soonest deadline."
          actionLabel="Upload a receipt"
          actionHref="/receipts/new"
        />
      ) : (
        <DeadlineTable
          receipts={receipts}
          field="return_deadline"
          columnLabel="Return by"
        />
      )}
    </div>
  );
}
