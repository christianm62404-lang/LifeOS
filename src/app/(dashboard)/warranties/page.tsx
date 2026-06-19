import { ShieldCheck } from "lucide-react";

import { getWarranties } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { DeadlineTable } from "@/components/deadline-table";
import { EmptyState } from "@/components/empty-state";
import { daysUntil } from "@/lib/utils";
import { SOON_THRESHOLD_DAYS } from "@/lib/constants";

export default async function WarrantiesPage() {
  const receipts = await getWarranties();
  const soonCount = receipts.filter((r) => {
    const d = daysUntil(r.warranty_expiration);
    return d !== null && d >= 0 && d <= SOON_THRESHOLD_DAYS;
  }).length;

  return (
    <div>
      <PageHeader
        title="Warranties"
        description={
          receipts.length > 0
            ? `${receipts.length} tracked · ${soonCount} expiring within ${SOON_THRESHOLD_DAYS} days`
            : "Track warranty expirations across your purchases."
        }
      />

      {receipts.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No warranties tracked"
          description="Add a warranty expiration date to a receipt and it will appear here, sorted by soonest expiration."
          actionLabel="Upload a receipt"
          actionHref="/receipts/new"
        />
      ) : (
        <DeadlineTable
          receipts={receipts}
          field="warranty_expiration"
          columnLabel="Warranty expires"
        />
      )}
    </div>
  );
}
