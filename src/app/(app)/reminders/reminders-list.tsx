"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Reminder } from "@/lib/types";
import { labelize } from "@/lib/constants";
import { cn, formatDate, relativeDueLabel, daysUntil } from "@/lib/utils";
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
import { ReminderDialog } from "./reminder-dialog";
import { deleteReminder, toggleReminderComplete } from "./actions";

function priorityVariant(
  priority: Reminder["priority"],
): "destructive" | "warning" | "secondary" {
  if (priority === "high") return "destructive";
  if (priority === "medium") return "warning";
  return "secondary";
}

export function RemindersList({
  reminders,
  canSmartReminders = false,
}: {
  reminders: Reminder[];
  canSmartReminders?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();

  async function onToggle(reminder: Reminder) {
    const result = await toggleReminderComplete(
      reminder.id,
      !reminder.is_complete,
    );
    if (result.ok) {
      toast({ variant: "success", title: result.message ?? "Updated" });
      router.refresh();
    } else {
      toast({ variant: "destructive", title: result.error });
    }
  }

  async function onDelete(reminder: Reminder) {
    if (!confirm(`Delete "${reminder.title}"? This cannot be undone.`)) return;
    const result = await deleteReminder(reminder.id);
    if (result.ok) {
      toast({ variant: "success", title: result.message ?? "Deleted" });
      router.refresh();
    } else {
      toast({ variant: "destructive", title: result.error });
    }
  }

  return (
    <div className="divide-y rounded-xl border bg-card">
      {reminders.map((reminder) => {
        const days = daysUntil(reminder.due_date);
        const overdue = !reminder.is_complete && days !== null && days < 0;
        const dueSoon =
          !reminder.is_complete && days !== null && days >= 0 && days <= 3;

        return (
          <div key={reminder.id} className="flex items-center gap-4 p-4">
            <Checkbox
              checked={reminder.is_complete}
              onCheckedChange={() => onToggle(reminder)}
              aria-label="Mark reminder complete"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "font-medium",
                    reminder.is_complete &&
                      "text-muted-foreground line-through",
                  )}
                >
                  {reminder.title}
                </span>
                <Badge variant={priorityVariant(reminder.priority)}>
                  {labelize(reminder.priority)}
                </Badge>
                {reminder.recurrence !== "none" && (
                  <Badge variant="outline">
                    {labelize(reminder.recurrence)}
                  </Badge>
                )}
                {reminder.is_complete ? (
                  <Badge variant="success">Done</Badge>
                ) : overdue ? (
                  <Badge variant="destructive">Overdue</Badge>
                ) : dueSoon ? (
                  <Badge variant="warning">Due soon</Badge>
                ) : null}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {formatDate(reminder.due_date)} ·{" "}
                {relativeDueLabel(reminder.due_date)}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Reminder actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <ReminderDialog
                  reminder={reminder}
                  canSmartReminders={canSmartReminders}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Pencil className="h-4 w-4" /> Edit
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => onDelete(reminder)}
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
