import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { hasFeature } from "@/lib/entitlements";
import { PageHeader } from "@/components/page-header";
import { UpgradeGate } from "@/components/upgrade-gate";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "AI suggestions — LifeOS" };

export default async function AiSuggestionsPage() {
  if (!(await hasFeature("ai-suggestions"))) {
    return (
      <div>
        <PageHeader
          title="AI suggestions"
          description="Smart nudges that help you stay ahead."
        />
        <UpgradeGate feature="ai-suggestions" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="AI suggestions"
        description="Smart nudges that help you stay ahead."
      />
      <ComingSoon
        icon={Sparkles}
        title="AI-powered suggestions"
        description="Personalised recommendations drawn from your bills, subscriptions and habits."
        bullets={[
          "Spot unused subscriptions worth cancelling",
          "Flag bills that crept up in price",
          "Suggest reminders before things lapse",
        ]}
      />
    </div>
  );
}
