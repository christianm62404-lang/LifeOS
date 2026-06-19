"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Subscription } from "@/lib/types";
import { labelize } from "@/lib/constants";
import { cn, formatCurrency, formatDate, relativeDueLabel } from "@/lib/utils";
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
import { SubscriptionDialog } from "./subscription-dialog";
import { deleteSubscription, toggleSubscriptionActive } from "./actions";

export function SubscriptionsList({
  subscriptions,
}: {
  subscriptions: Subscription[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  async function onToggle(sub: Subscription) {
    const result = await toggleSubscriptionActive(sub.id, !sub.is_active);
    if (result.ok) {
      toast({ variant: "success", title: result.message ?? "Updated" });
      router.refresh();
    } else {
      toast({ variant: "destructive", title: result.error });
    }
  }

  async function onDelete(sub: Subscription) {
    if (!confirm(`Delete "${sub.name}"? This cannot be undone.`)) return;
    const result = await deleteSubscription(sub.id);
    if (result.ok) {
      toast({ variant: "success", title: result.message ?? "Deleted" });
      router.refresh();
    } else {
      toast({ variant: "destructive", title: result.error });
    }
  }

  return (
    <div className="divide-y rounded-xl border bg-card">
      {subscriptions.map((sub) => (
        <div key={sub.id} className="flex items-center gap-4 p-4">
          <Checkbox
            checked={sub.is_active}
            onCheckedChange={() => onToggle(sub)}
            aria-label={sub.is_active ? "Mark inactive" : "Mark active"}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "font-medium",
                  !sub.is_active && "text-muted-foreground line-through",
                )}
              >
                {sub.name}
              </span>
              <Badge variant="outline">{labelize(sub.category)}</Badge>
              {sub.is_active ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {formatDate(sub.next_billing_date)} ·{" "}
              {relativeDueLabel(sub.next_billing_date)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold tabular-nums">
              {formatCurrency(sub.amount)}
            </p>
            <p className="text-xs text-muted-foreground">
              / {labelize(sub.billing_cycle)}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Subscription actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <SubscriptionDialog
                subscription={sub}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Pencil className="h-4 w-4" /> Edit
                  </DropdownMenuItem>
                }
              />
              {sub.cancellation_link && (
                <DropdownMenuItem asChild>
                  <a
                    href={sub.cancellation_link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" /> Cancellation page
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => onDelete(sub)}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  );
}
