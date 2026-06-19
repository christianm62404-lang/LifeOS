import { hasFeature } from "@/lib/entitlements";
import type { Feature } from "@/lib/billing";
import { UpgradeGate } from "@/components/upgrade-gate";

/**
 * Server-side gate. Renders its children only when the signed-in user's plan
 * includes `feature`; otherwise shows an upgrade prompt. Because this runs on
 * the server, gated content is never sent to unauthorised clients.
 */
export async function FeatureGate({
  feature,
  children,
}: {
  feature: Feature;
  children: React.ReactNode;
}) {
  if (await hasFeature(feature)) {
    return <>{children}</>;
  }
  return <UpgradeGate feature={feature} />;
}
