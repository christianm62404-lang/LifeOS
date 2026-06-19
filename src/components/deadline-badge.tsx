import { Badge } from "@/components/ui/badge";
import { daysUntil, formatDate, relativeDeadline } from "@/lib/utils";
import { SOON_THRESHOLD_DAYS } from "@/lib/constants";

/**
 * Shows a date with a colour-coded urgency badge:
 * - red (destructive) when already passed
 * - amber (warning) when within SOON_THRESHOLD_DAYS
 * - green (success) otherwise
 */
export function DeadlineBadge({
  date,
  showDate = true,
}: {
  date: string | null | undefined;
  showDate?: boolean;
}) {
  if (!date) return <span className="text-muted-foreground">—</span>;

  const days = daysUntil(date);
  let variant: "destructive" | "warning" | "success" = "success";
  if (days !== null && days < 0) variant = "destructive";
  else if (days !== null && days <= SOON_THRESHOLD_DAYS) variant = "warning";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showDate && <span className="tabular-nums">{formatDate(date)}</span>}
      <Badge variant={variant}>{relativeDeadline(date)}</Badge>
    </div>
  );
}
