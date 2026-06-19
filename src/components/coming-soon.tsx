import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ComingSoon({
  icon: Icon,
  title,
  description,
  bullets,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  bullets?: string[];
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card p-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Badge variant="secondary">Coming soon</Badge>
      </div>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      {bullets && bullets.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
          {bullets.map((b) => (
            <li key={b}>• {b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
