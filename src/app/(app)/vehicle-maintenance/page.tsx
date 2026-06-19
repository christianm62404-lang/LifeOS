import type { Metadata } from "next";
import { Car } from "lucide-react";
import { hasFeature } from "@/lib/entitlements";
import { PageHeader } from "@/components/page-header";
import { UpgradeGate } from "@/components/upgrade-gate";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Vehicle maintenance — LifeOS" };

export default async function VehicleMaintenancePage() {
  if (!(await hasFeature("vehicle-maintenance"))) {
    return (
      <div>
        <PageHeader
          title="Vehicle maintenance"
          description="Keep every vehicle road-ready."
        />
        <UpgradeGate feature="vehicle-maintenance" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Vehicle maintenance"
        description="Keep every vehicle road-ready."
      />
      <ComingSoon
        icon={Car}
        title="Vehicle maintenance tracking"
        description="Mileage- and time-based service schedules for each of your vehicles."
        bullets={[
          "Oil changes, tire rotations and brake checks",
          "Registration & inspection renewals",
          "Per-vehicle service history",
        ]}
      />
    </div>
  );
}
