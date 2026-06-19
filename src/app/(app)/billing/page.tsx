import { Suspense } from "react";
import type { Metadata } from "next";
import { Check, Sparkles } from "lucide-react";
import { getEntitlement } from "@/lib/entitlements";
import { PLANS, TIER_RANK, tierLabel, type Tier } from "@/lib/billing";
import { billingEnabled, isStripeConfigured } from "@/lib/env";
import { cn, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckoutStatusToast,
  ManageBillingButton,
  UpgradeButton,
} from "./plan-actions";

export const metadata: Metadata = { title: "Plans & billing — LifeOS" };

export default async function BillingPage() {
  const { tier, status, currentPeriodEnd } = await getEntitlement();
  const stripeReady = isStripeConfigured();
  const onPaidPlan = tier !== "free" && status !== "billing_disabled";

  return (
    <div>
      <Suspense fallback={null}>
        <CheckoutStatusToast />
      </Suspense>

      <PageHeader
        title="Plans & billing"
        description="Choose the plan that fits how much of life you want LifeOS to run."
      >
        {onPaidPlan && stripeReady && <ManageBillingButton />}
      </PageHeader>

      {/* Current plan banner */}
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="text-lg font-semibold">
              {tierLabel(tier)}{" "}
              {status === "billing_disabled" && (
                <Badge variant="secondary">Dev mode</Badge>
              )}
            </p>
            {currentPeriodEnd && (
              <p className="text-xs text-muted-foreground">
                Renews {formatDate(currentPeriodEnd)}
              </p>
            )}
          </div>
          {status === "billing_disabled" && (
            <p className="max-w-sm text-xs text-muted-foreground">
              Billing is disabled in this environment, so all features are
              unlocked. Set <code>BILLING_ENABLED=true</code> to enforce plans.
            </p>
          )}
        </CardContent>
      </Card>

      {!stripeReady && billingEnabled && (
        <Card className="mb-6 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-5 text-sm">
            Stripe isn&apos;t fully configured yet. Add your Stripe keys and
            price IDs to <code>.env.local</code> to enable upgrades. See the
            README for setup steps.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.tier === tier && status !== "billing_disabled";
          const isDowngrade = TIER_RANK[plan.tier] < TIER_RANK[tier as Tier];

          return (
            <Card
              key={plan.tier}
              className={cn(
                "relative flex flex-col",
                plan.highlighted && "border-primary shadow-lg",
              )}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {isCurrent && <Badge variant="success">Current</Badge>}
                </CardTitle>
                <CardDescription>{plan.tagline}</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-bold">{plan.priceLabel}</span>
                  {plan.priceMonthly > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {" "}
                      / month
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="mb-6 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  {plan.tier === "free" ? (
                    <Button variant="outline" className="w-full" disabled>
                      {tier === "free" ? "Your plan" : "Included"}
                    </Button>
                  ) : isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      <Sparkles className="h-4 w-4" /> Current plan
                    </Button>
                  ) : isDowngrade && stripeReady ? (
                    <ManageBillingButton />
                  ) : stripeReady ? (
                    <UpgradeButton
                      tier={plan.tier as "personal" | "pro"}
                      label={`Upgrade to ${plan.name}`}
                      variant={plan.highlighted ? "default" : "outline"}
                    />
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      Upgrade unavailable
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
