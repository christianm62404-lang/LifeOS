"use client";

import { useRouter } from "next/navigation";
import {
  Download,
  FileText,
  MoreHorizontal,
  Paperclip,
  Trash2,
} from "lucide-react";
import type { DocumentRecord } from "@/lib/types";
import { labelize } from "@/lib/constants";
import { formatDate, daysUntil, relativeDueLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { deleteDocument, getDocumentUrl } from "./actions";

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsList({ documents }: { documents: DocumentRecord[] }) {
  const router = useRouter();
  const { toast } = useToast();

  async function onDownload(doc: DocumentRecord) {
    if (!doc.file_path) return;
    const result = await getDocumentUrl(doc.file_path);
    if (result.ok) {
      window.open(result.url, "_blank", "noopener,noreferrer");
    } else {
      toast({ variant: "destructive", title: result.error });
    }
  }

  async function onDelete(doc: DocumentRecord) {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    const result = await deleteDocument(doc.id);
    if (result.ok) {
      toast({ variant: "success", title: result.message ?? "Deleted" });
      router.refresh();
    } else {
      toast({ variant: "destructive", title: result.error });
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {documents.map((doc) => {
        const days = daysUntil(doc.expiration_date);
        const expired = days !== null && days < 0;
        const expiringSoon = days !== null && days >= 0 && days <= 30;

        return (
          <div
            key={doc.id}
            className="flex flex-col rounded-xl border bg-card p-5"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Document actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {doc.file_path && (
                    <DropdownMenuItem onSelect={() => onDownload(doc)}>
                      <Download className="h-4 w-4" /> Download
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => onDelete(doc)}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <h3 className="truncate font-medium" title={doc.title}>
              {doc.title}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{labelize(doc.document_type)}</Badge>
              {expired ? (
                <Badge variant="destructive">Expired</Badge>
              ) : expiringSoon ? (
                <Badge variant="warning">Expiring soon</Badge>
              ) : null}
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              {doc.expiration_date
                ? `Expires ${formatDate(doc.expiration_date)} · ${relativeDueLabel(doc.expiration_date)}`
                : "No expiry date"}
            </p>

            {doc.file_name && (
              <p className="mt-2 flex items-center gap-1 truncate text-xs text-muted-foreground">
                <Paperclip className="h-3 w-3 shrink-0" />
                <span className="truncate">{doc.file_name}</span>
                <span className="shrink-0">{formatSize(doc.file_size)}</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
