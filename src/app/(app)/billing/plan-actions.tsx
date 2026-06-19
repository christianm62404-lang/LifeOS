"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Settings2, Sparkles } from "lucide-react";
import type { Tier } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { openBillingPortal, startCheckout } from "./actions";

/** Reads ?status=success|cancelled from the Checkout return and toasts it. */
export function CheckoutStatusToast() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const status = params.get("status");

  useEffect(() => {
    if (status === "success") {
      toast({
        variant: "success",
        title: "Welcome aboard!",
        description: "Your subscription is active. Enjoy your new features.",
      });
      router.replace("/billing");
    } else if (status === "cancelled") {
      toast({
        title: "Checkout cancelled",
        description: "No charge was made. You can upgrade any time.",
      });
      router.replace("/billing");
    }
  }, [status, toast, router]);

  return null;
}

export function UpgradeButton({
  tier,
  label,
  disabled,
  variant = "default",
}: {
  tier: "personal" | "pro";
  label: string;
  disabled?: boolean;
  variant?: "default" | "outline";
}) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function onClick() {
    startTransition(async () => {
      const result = await startCheckout(tier);
      if (result.ok) {
        window.location.href = result.url;
      } else {
        toast({ variant: "destructive", title: "Couldn't start checkout", description: result.error });
      }
    });
  }

  return (
    <Button
      onClick={onClick}
      disabled={disabled || pending}
      variant={variant}
      className="w-full"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {label}
    </Button>
  );
}

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function onClick() {
    setLoading(true);
    const result = await openBillingPortal();
    setLoading(false);
    if (result.ok) {
      window.location.href = result.url;
    } else {
      toast({ variant: "destructive", title: "Couldn't open portal", description: result.error });
    }
  }

  return (
    <Button onClick={onClick} disabled={loading} variant="outline">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />}
      Manage billing
    </Button>
  );
}
