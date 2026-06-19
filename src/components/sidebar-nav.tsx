"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { NAV_SECTIONS } from "@/lib/nav";
import { tierIncludesFeature, type Tier } from "@/lib/billing";
import { cn } from "@/lib/utils";

export function SidebarNav({
  tier,
  onNavigate,
}: {
  tier: Tier;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-4 px-3">
      {NAV_SECTIONS.map((section, i) => (
        <div key={section.label ?? `section-${i}`} className="flex flex-col gap-1">
          {section.label && (
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              {section.label}
            </p>
          )}
          {section.items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const locked = item.feature
              ? !tierIncludesFeature(tier, item.feature)
              : false;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{item.title}</span>
                {locked && !active && (
                  <Lock className="h-3.5 w-3.5 shrink-0 opacity-60" />
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
