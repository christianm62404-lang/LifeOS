import Link from "next/link";
import { ChevronRight } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryBadge } from "@/components/category-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Receipt } from "@/lib/types";

export function ReceiptsTable({ receipts }: { receipts: Receipt[] }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden rounded-lg border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Merchant</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts.map((r) => (
              <TableRow key={r.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link
                    href={`/receipts/${r.id}`}
                    className="block hover:underline"
                  >
                    {r.merchant_name || "Untitled receipt"}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(r.purchase_date)}
                </TableCell>
                <TableCell>
                  <CategoryBadge category={r.category} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.payment_method || "—"}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCurrency(r.total_amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {receipts.map((r) => (
          <Link
            key={r.id}
            href={`/receipts/${r.id}`}
            className="flex items-center justify-between rounded-lg border bg-card p-4"
          >
            <div className="min-w-0 space-y-1">
              <p className="truncate font-medium">
                {r.merchant_name || "Untitled receipt"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(r.purchase_date)}
              </p>
              <CategoryBadge category={r.category} />
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium tabular-nums">
                {formatCurrency(r.total_amount)}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
