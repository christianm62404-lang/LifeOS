"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Receipt } from "lucide-react";

import { SidebarNav } from "@/components/sidebar-nav";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-6 py-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Receipt className="h-5 w-5" />
      </div>
      <span className="text-lg font-semibold tracking-tight">Receipt Vault</span>
    </Link>
  );
}

export function DashboardShell({
  children,
  email,
  name,
}: {
  children: React.ReactNode;
  email: string | null;
  name: string | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background md:flex">
        <Brand />
        <div className="flex-1 py-2">
          <SidebarNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2">
            {/* Mobile menu */}
            <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="left-0 top-0 h-full max-w-[16rem] translate-x-0 translate-y-0 rounded-none border-r p-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:rounded-none">
                <DialogTitle className="sr-only">Navigation</DialogTitle>
                <Brand />
                <SidebarNav onNavigate={() => setMobileOpen(false)} />
              </DialogContent>
            </Dialog>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 md:hidden"
            >
              <Receipt className="h-5 w-5" />
              <span className="font-semibold">Receipt Vault</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/receipts/new">Upload receipt</Link>
            </Button>
            <UserMenu email={email} name={name} />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
