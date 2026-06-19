"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, Zap } from "lucide-react";
import type { Bill } from "@/lib/types";
import { labelize } from "@/lib/constants";
import {
  cn,
  formatCurrency,
  formatDate,
  relativeDueLabel,
  daysUntil,
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BillDialog } from "./bill-dialog";
import { deleteBill, toggleBillPaid } from "./actions";

export function BillsList({ bills }: { bills: Bill[] }) {
  const router = useRouter();
  const { toast } = useToast();

  async function onToggle(bill: Bill) {
    const result = await toggleBillPaid(bill.id, !bill.is_paid);
    if (result.ok) {
      toast({ variant: "success", title: result.message ?? "Updated" });
      router.refresh();
    } else {
      toast({ variant: "destructive", title: result.error });
    }
  }

  async function onDelete(bill: Bill) {
    if (!confirm(`Delete "${bill.name}"? This cannot be undone.`)) return;
    const result = await deleteBill(bill.id);
    if (result.ok) {
      toast({ variant: "success", title: result.message ?? "Deleted" });
      router.refresh();
    } else {
      toast({ variant: "destructive", title: result.error });
    }
  }

  return (
    <div className="divide-y rounded-xl border bg-card">
      {bills.map((bill) => {
        const days = daysUntil(bill.due_date);
        const overdue = !bill.is_paid && days !== null && days < 0;
        const dueSoon = !bill.is_paid && days !== null && days >= 0 && days <= 7;

        return (
          <div
            key={bill.id}
            className="flex items-center gap-4 p-4"
          >
            <Checkbox
              checked={bill.is_paid}
              onCheckedChange={() => onToggle(bill)}
              aria-label="Mark bill paid"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "font-medium",
                    bill.is_paid && "text-muted-foreground line-through",
                  )}
                >
                  {bill.name}
                </span>
                <Badge variant="outline">{labelize(bill.category)}</Badge>
                {bill.autopay && (
                  <Badge variant="secondary" className="gap-1">
                    <Zap className="h-3 w-3" /> Autopay
                  </Badge>
                )}
                {bill.is_paid ? (
                  <Badge variant="success">Paid</Badge>
                ) : overdue ? (
                  <Badge variant="destructive">Overdue</Badge>
                ) : dueSoon ? (
                  <Badge variant="warning">Due soon</Badge>
                ) : null}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {formatDate(bill.due_date)} · {relativeDueLabel(bill.due_date)}
                {bill.recurrence !== "none" &&
                  ` · ${labelize(bill.recurrence)}`}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold tabular-nums">
                {formatCurrency(bill.amount)}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Bill actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <BillDialog
                  bill={bill}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Pencil className="h-4 w-4" /> Edit
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => onDelete(bill)}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
    </div>
  );
}
