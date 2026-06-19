"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/categories";

export function ReceiptSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const category = searchParams.get("category") ?? "all";

  const apply = useCallback(
    (next: { q?: string; category?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.q !== undefined) {
        if (next.q) params.set("q", next.q);
        else params.delete("q");
      }
      if (next.category !== undefined) {
        if (next.category && next.category !== "all")
          params.set("category", next.category);
        else params.delete("category");
      }
      startTransition(() => {
        router.replace(`/receipts?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  // Debounce the free-text search.
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (search === current) return;
    const t = setTimeout(() => apply({ q: search }), 350);
    return () => clearTimeout(t);
  }, [search, apply, searchParams]);

  const hasFilters = Boolean(search) || category !== "all";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search merchant, item, payment, notes…"
          className="pl-9"
          aria-label="Search receipts"
        />
      </div>
      <Select value={category} onValueChange={(v) => apply({ category: v })}>
        <SelectTrigger className="sm:w-48" aria-label="Filter by category">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => {
            setSearch("");
            apply({ q: "", category: "all" });
          }}
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
