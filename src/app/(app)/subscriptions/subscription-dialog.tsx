"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  subscriptionSchema,
  type SubscriptionInput,
} from "@/lib/validations";
import {
  BILLING_CYCLE_OPTIONS,
  SUBSCRIPTION_CATEGORIES,
  labelize,
} from "@/lib/constants";
import type { Subscription } from "@/lib/types";
import { createSubscription, updateSubscription } from "./actions";
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

export function SubscriptionDialog({
  subscription,
  trigger,
}: {
  subscription?: Subscription;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = Boolean(subscription);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionInput>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: subscription
      ? {
          name: subscription.name,
          amount: subscription.amount,
          billingCycle: subscription.billing_cycle,
          nextBillingDate: toDateInput(subscription.next_billing_date),
          category: subscription.category,
          cancellationLink: subscription.cancellation_link ?? "",
          notes: subscription.notes ?? "",
        }
      : {
          name: "",
          amount: 0,
          billingCycle: "monthly",
          nextBillingDate: "",
          category: "other",
          cancellationLink: "",
          notes: "",
        },
  });

  async function onSubmit(values: SubscriptionInput) {
    const result = subscription
      ? await updateSubscription(subscription.id, values)
      : await createSubscription(values);

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
            <Plus className="h-4 w-4" /> Add subscription
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit subscription" : "Add subscription"}
          </DialogTitle>
          <DialogDescription>
            Track a recurring subscription so you always know what you&apos;re
            paying for.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Netflix" {...register("name")} />
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
                placeholder="15.99"
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">
                  {errors.amount.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextBillingDate">Next billing date</Label>
              <Input
                id="nextBillingDate"
                type="date"
                {...register("nextBillingDate")}
              />
              {errors.nextBillingDate && (
                <p className="text-xs text-destructive">
                  {errors.nextBillingDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Billing cycle</Label>
              <Select
                value={watch("billingCycle")}
                onValueChange={(v) =>
                  setValue("billingCycle", v as SubscriptionInput["billingCycle"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_CYCLE_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {labelize(c)}
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
                  setValue("category", v as SubscriptionInput["category"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {labelize(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancellationLink">Cancellation link</Label>
            <Input
              id="cancellationLink"
              type="url"
              placeholder="https://..."
              {...register("cancellationLink")}
            />
            {errors.cancellationLink && (
              <p className="text-xs text-destructive">
                {errors.cancellationLink.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Plan tier, shared with…"
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add subscription"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
