"use client";

import { useState } from "react";
import { Menu, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/sidebar-nav";
import type { Tier } from "@/lib/billing";

export function MobileSidebar({ tier }: { tier: Tier }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 pt-10">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="mb-6 flex items-center gap-2 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">LifeOS</span>
        </div>
        <SidebarNav tier={tier} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
