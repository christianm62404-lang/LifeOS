"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, Minus, Plus } from "lucide-react";
import type { Goal } from "@/lib/types";
import type { GoalStatus } from "@/lib/constants";
import { labelize } from "@/lib/constants";
import { formatDate, relativeDueLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { GoalDialog } from "./goal-dialog";
import { deleteGoal, updateGoalProgress } from "./actions";

const STATUS_VARIANT: Record<
  GoalStatus,
  "default" | "secondary" | "success" | "warning"
> = {
  completed: "success",
  "in-progress": "default",
  "on-hold": "warning",
  "not-started": "secondary",
};

export function GoalsList({ goals }: { goals: Goal[] }) {
  const router = useRouter();
  const { toast } = useToast();

  async function onDelete(goal: Goal) {
    if (!confirm(`Delete "${goal.title}"? This cannot be undone.`)) return;
    const result = await deleteGoal(goal.id);
    if (result.ok) {
      toast({ variant: "success", title: result.message ?? "Deleted" });
      router.refresh();
    } else {
      toast({ variant: "destructive", title: result.error });
    }
  }

  async function onProgress(goal: Goal, delta: number) {
    const next = Math.min(100, Math.max(0, goal.progress + delta));
    if (next === goal.progress) return;
    const result = await updateGoalProgress(goal.id, next);
    if (result.ok) {
      toast({ variant: "success", title: result.message ?? "Updated" });
      router.refresh();
    } else {
      toast({ variant: "destructive", title: result.error });
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {goals.map((goal) => (
        <Card key={goal.id}>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <CardTitle className="min-w-0 flex-1 leading-snug">
              {goal.title}
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="-mr-2 -mt-1 shrink-0"
                  aria-label="Goal actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <GoalDialog
                  goal={goal}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Pencil className="h-4 w-4" /> Edit
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => onDelete(goal)}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{labelize(goal.category)}</Badge>
              <Badge variant={STATUS_VARIANT[goal.status]}>
                {labelize(goal.status)}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">
              {goal.target_date
                ? `${formatDate(goal.target_date)} · ${relativeDueLabel(
                    goal.target_date,
                  )}`
                : "No target date"}
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium tabular-nums">
                  {goal.progress}%
                </span>
              </div>
              <Progress value={goal.progress} />
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => onProgress(goal, -10)}
                  disabled={goal.progress <= 0}
                >
                  <Minus className="h-3 w-3" /> 10%
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => onProgress(goal, 10)}
                  disabled={goal.progress >= 100}
                >
                  <Plus className="h-3 w-3" /> 10%
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
