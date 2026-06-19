import { Badge } from "@/components/ui/badge";
import { categoryColor } from "@/lib/categories";
import { cn } from "@/lib/utils";

export function CategoryBadge({
  category,
  className,
}: {
  category: string | null | undefined;
  className?: string;
}) {
  if (!category) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", categoryColor(category), className)}
    >
      {category}
    </Badge>
  );
}
