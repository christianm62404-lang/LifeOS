import type { Metadata } from "next";
import { Home } from "lucide-react";
import { hasFeature } from "@/lib/entitlements";
import { PageHeader } from "@/components/page-header";
import { UpgradeGate } from "@/components/upgrade-gate";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Home maintenance — LifeOS" };

export default async function HomeMaintenancePage() {
  if (!(await hasFeature("home-maintenance"))) {
    return (
      <div>
        <PageHeader
          title="Home maintenance"
          description="Stay ahead of seasonal home upkeep."
        />
        <UpgradeGate feature="home-maintenance" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Home maintenance"
        description="Stay ahead of seasonal home upkeep."
      />
      <ComingSoon
        icon={Home}
        title="Home maintenance schedules"
        description="Track recurring home upkeep with smart, season-aware schedules."
        bullets={[
          "Replace HVAC filters & test smoke detectors",
          "Gutter cleaning, water-heater flush, deep cleans",
          "Auto-generated reminders tuned to your home",
        ]}
      />
    </div>
  );
}
