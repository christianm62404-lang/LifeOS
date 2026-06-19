import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import {
  FEATURE_LABELS,
  FEATURE_MIN_TIER,
  tierLabel,
  type Feature,
} from "@/lib/billing";
import { Button } from "@/components/ui/button";

/**
 * Shown in place of gated content when the current user's plan does not
 * include the requested feature.
 */
export function UpgradeGate({ feature }: { feature: Feature }) {
  const requiredTier = FEATURE_MIN_TIER[feature];
  const label = FEATURE_LABELS[feature];

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card p-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Lock className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold">{label} is a paid feature</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Upgrade to the <strong>{tierLabel(requiredTier)}</strong> plan to unlock{" "}
        {label.toLowerCase()} and more.
      </p>
      <Button asChild className="mt-6">
        <Link href="/billing">
          <Sparkles className="h-4 w-4" /> View plans
        </Link>
      </Button>
    </div>
  );
}
