import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryBadge } from "@/components/category-badge";
import { DeadlineBadge } from "@/components/deadline-badge";
import { cn, daysUntil, formatDate } from "@/lib/utils";
import { SOON_THRESHOLD_DAYS } from "@/lib/constants";
import type { Receipt } from "@/lib/types";

export function DeadlineTable({
  receipts,
  field,
  columnLabel,
}: {
  receipts: Receipt[];
  field: "warranty_expiration" | "return_deadline";
  columnLabel: string;
}) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden rounded-lg border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Merchant</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Purchase date</TableHead>
              <TableHead>{columnLabel}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts.map((r) => {
              const days = daysUntil(r[field]);
              const soon = days !== null && days >= 0 && days <= SOON_THRESHOLD_DAYS;
              return (
                <TableRow
                  key={r.id}
                  className={cn(soon && "bg-amber-50 dark:bg-amber-950/20")}
                >
                  <TableCell className="font-medium">
                    <Link
                      href={`/receipts/${r.id}`}
                      className="hover:underline"
                    >
                      {r.merchant_name || "Untitled receipt"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={r.category} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(r.purchase_date)}
                  </TableCell>
                  <TableCell>
                    <DeadlineBadge date={r[field]} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {receipts.map((r) => {
          const days = daysUntil(r[field]);
          const soon = days !== null && days >= 0 && days <= SOON_THRESHOLD_DAYS;
          return (
            <Link
              key={r.id}
              href={`/receipts/${r.id}`}
              className={cn(
                "block space-y-2 rounded-lg border bg-card p-4",
                soon && "border-amber-300 bg-amber-50 dark:bg-amber-950/20",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {r.merchant_name || "Untitled receipt"}
                </span>
                <CategoryBadge category={r.category} />
              </div>
              <DeadlineBadge date={r[field]} />
            </Link>
          );
        })}
      </div>
    </>
  );
}
