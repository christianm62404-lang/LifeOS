import type { Metadata } from "next";
import { FileText, AlertTriangle, CalendarClock, Files } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { daysUntil } from "@/lib/utils";
import type { DocumentRecord } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { DocumentDialog } from "./document-dialog";
import { DocumentsList } from "./documents-list";

export const metadata: Metadata = { title: "Documents — LifeOS" };

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("*")
    .order("expiration_date", { ascending: true, nullsFirst: false });

  const documents = (data ?? []) as DocumentRecord[];

  const expiringSoon = documents.filter((d) => {
    const days = daysUntil(d.expiration_date);
    return days !== null && days >= 0 && days <= 30;
  }).length;
  const expired = documents.filter((d) => {
    const days = daysUntil(d.expiration_date);
    return days !== null && days < 0;
  }).length;
  const withFiles = documents.filter((d) => d.file_path).length;

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Keep important documents safe and track expiry dates."
      >
        <DocumentDialog />
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total documents" value={documents.length} icon={Files} />
        <StatCard
          label="With files"
          value={withFiles}
          icon={FileText}
          hint="Stored in Supabase Storage"
        />
        <StatCard
          label="Expiring in 30 days"
          value={expiringSoon}
          icon={CalendarClock}
          accent="warning"
        />
        <StatCard
          label="Expired"
          value={expired}
          icon={AlertTriangle}
          accent="destructive"
        />
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload insurance, licenses, passports, leases and more — and never miss a renewal."
        >
          <DocumentDialog />
        </EmptyState>
      ) : (
        <DocumentsList documents={documents} />
      )}
    </div>
  );
}
