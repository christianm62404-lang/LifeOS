import Link from "next/link";
import { Boxes } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Boxes className="h-6 w-6" />
        </div>
        <span className="text-2xl font-bold tracking-tight">LifeOS</span>
      </Link>
      {children}
      <p className="mt-8 max-w-sm text-center text-xs text-muted-foreground">
        Your personal operating system for bills, subscriptions, documents,
        reminders and goals — all in one place.
      </p>
    </div>
  );
}
