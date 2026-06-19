"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Pencil, Trash2, Loader2, ExternalLink } from "lucide-react";

import { deleteReceipt, getFileUrl } from "@/app/(dashboard)/receipts/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ReceiptActions({
  id,
  filePath,
  merchant,
}: {
  id: string;
  filePath: string | null;
  merchant: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [loadingFile, setLoadingFile] = useState(false);

  async function viewFile() {
    if (!filePath) return;
    setLoadingFile(true);
    const result = await getFileUrl(filePath);
    setLoadingFile(false);
    if (!result.ok || !result.data) {
      toast.error("Could not open file", { description: result.error });
      return;
    }
    window.open(result.data.url, "_blank", "noopener,noreferrer");
  }

  function onDelete() {
    startDelete(async () => {
      const result = await deleteReceipt(id);
      // A successful delete redirects server-side; only errors return here.
      if (result && !result.ok) {
        toast.error("Could not delete receipt", { description: result.error });
        setConfirmOpen(false);
      } else {
        toast.success("Receipt deleted");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filePath && (
        <Button variant="outline" onClick={viewFile} disabled={loadingFile}>
          {loadingFile ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
          View file
        </Button>
      )}
      <Button asChild variant="outline">
        <Link href={`/receipts/${id}/edit`}>
          <Pencil className="h-4 w-4" />
          Edit
        </Link>
      </Button>
      <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete receipt?</DialogTitle>
            <DialogDescription>
              This will permanently delete the receipt from{" "}
              <span className="font-medium">{merchant}</span>, its line items and
              the stored file. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Standalone "Download / view file" button used in lists where needed. */
export function ViewFileButton({ filePath }: { filePath: string }) {
  const [loading, setLoading] = useState(false);
  async function open() {
    setLoading(true);
    const result = await getFileUrl(filePath);
    setLoading(false);
    if (result.ok && result.data) {
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    } else {
      toast.error("Could not open file");
    }
  }
  return (
    <Button variant="ghost" size="sm" onClick={open} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      File
    </Button>
  );
}
