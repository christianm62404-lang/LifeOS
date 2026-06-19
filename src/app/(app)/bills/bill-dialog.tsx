"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { billSchema, type BillInput } from "@/lib/validations";
import {
  BILL_CATEGORIES,
  RECURRENCE_OPTIONS,
  labelize,
} from "@/lib/constants";
import type { Bill } from "@/lib/types";
import { createBill, updateBill } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

function toDateInput(value: string): string {
  return value ? value.slice(0, 10) : "";
}

export function BillDialog({
  bill,
  trigger,
}: {
  bill?: Bill;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = Boolean(bill);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BillInput>({
    resolver: zodResolver(billSchema),
    defaultValues: bill
      ? {
          name: bill.name,
          amount: bill.amount,
          dueDate: toDateInput(bill.due_date),
          recurrence: bill.recurrence,
          autopay: bill.autopay,
          category: bill.category,
          notes: bill.notes ?? "",
        }
      : {
          name: "",
          amount: 0,
          dueDate: "",
          recurrence: "monthly",
          autopay: false,
          category: "other",
          notes: "",
        },
  });

  async function onSubmit(values: BillInput) {
    const result = bill
      ? await updateBill(bill.id, values)
      : await createBill(values);

    if (result.ok) {
      toast({ variant: "success", title: result.message ?? "Saved" });
      setOpen(false);
      if (!isEdit) reset();
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: result.error,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" /> Add bill
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit bill" : "Add bill"}</DialogTitle>
          <DialogDescription>
            Track a recurring or one-off bill so you never miss a due date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Electric bill" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="120.00"
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">
                  {errors.amount.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" type="date" {...register("dueDate")} />
              {errors.dueDate && (
                <p className="text-xs text-destructive">
                  {errors.dueDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Recurrence</Label>
              <Select
                value={watch("recurrence")}
                onValueChange={(v) =>
                  setValue("recurrence", v as BillInput["recurrence"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {labelize(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={watch("category")}
                onValueChange={(v) =>
                  setValue("category", v as BillInput["category"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {labelize(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="autopay">Autopay</Label>
              <p className="text-xs text-muted-foreground">
                This bill is paid automatically.
              </p>
            </div>
            <Switch
              id="autopay"
              checked={watch("autopay")}
              onCheckedChange={(v) => setValue("autopay", v)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Account number, payee details…"
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add bill"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
