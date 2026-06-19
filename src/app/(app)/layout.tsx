import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Boxes, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/entitlements";
import { tierLabel } from "@/lib/billing";
import { SidebarNav } from "@/components/sidebar-nav";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { GlobalSearch } from "@/components/global-search";
import { UserNav } from "@/components/user-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { tier } = await getEntitlement();
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ?? "";
  const email = user.email ?? "";

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center gap-2 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">LifeOS</span>
          <Badge variant="secondary" className="ml-auto">
            {tierLabel(tier)}
          </Badge>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <SidebarNav tier={tier} />
        </div>
        {tier !== "pro" && (
          <div className="border-t p-3">
            <Button asChild className="w-full" size="sm">
              <Link href="/billing">
                <Sparkles className="h-4 w-4" /> Upgrade plan
              </Link>
            </Button>
          </div>
        )}
      </aside>

      <div className="flex flex-1 flex-col md:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
          <MobileSidebar tier={tier} />
          <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
            <Boxes className="h-5 w-5" />
          </Link>
          <Suspense fallback={<div className="h-9 w-full max-w-md" />}>
            <GlobalSearch />
          </Suspense>
          <div className="ml-auto">
            <UserNav email={email} fullName={fullName} />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
