"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Info } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { STORAGE_BUCKET } from "@/lib/constants";
import { extractFromStorage } from "@/app/(dashboard)/receipts/actions";
import { FileDropzone } from "@/components/file-dropzone";
import { ReceiptForm } from "@/components/receipt-form";
import { Card, CardContent } from "@/components/ui/card";
import type { ReceiptValues } from "@/lib/validations";
import type { Category } from "@/lib/categories";

interface UploadedFile {
  filePath: string;
  fileType: string;
  fileName: string;
}

function fileExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function NewReceipt() {
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Uploading…");
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null);
  const [defaults, setDefaults] = useState<ReceiptValues | null>(null);
  const [source, setSource] = useState<"ai" | "mock" | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setBusyLabel("Uploading…");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Your session expired. Please sign in again.");
        setBusy(false);
        return;
      }

      const path = `${user.id}/${Date.now()}_${sanitize(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        toast.error("Upload failed", { description: uploadError.message });
        setBusy(false);
        return;
      }

      setBusyLabel("Extracting details…");
      const result = await extractFromStorage(path, file.name, file.type);

      const extracted = result.ok ? result.data!.extracted : null;
      if (result.ok) {
        setSource(result.data!.source);
      } else {
        toast.error("Extraction failed — fill the details manually", {
          description: result.error,
        });
      }

      setUploaded({
        filePath: path,
        fileType: file.type || fileExtension(file.name),
        fileName: file.name,
      });

      setDefaults({
        merchant_name: extracted?.merchant_name ?? "",
        purchase_date: extracted?.purchase_date ?? null,
        total_amount: extracted?.total_amount ?? null,
        category: (extracted?.category as Category) ?? "Other",
        payment_method: extracted?.payment_method ?? null,
        warranty_expiration: extracted?.warranty_expiration ?? null,
        return_deadline: extracted?.return_deadline ?? null,
        notes: extracted?.notes ?? null,
        items:
          extracted?.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price ?? null,
            warranty_months: i.warranty_months ?? null,
          })) ?? [],
      });

      toast.success("File uploaded — review the details below");
    } catch (err) {
      toast.error("Something went wrong", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  if (uploaded && defaults) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-4 py-3 text-sm">
          {source === "ai" ? (
            <>
              <Sparkles className="h-4 w-4 text-primary" />
              <span>
                Details extracted by AI from{" "}
                <span className="font-medium">{uploaded.fileName}</span>. Review
                and edit before saving.
              </span>
            </>
          ) : (
            <>
              <Info className="h-4 w-4 text-primary" />
              <span>
                No AI key configured, so we pre-filled sample data from{" "}
                <span className="font-medium">{uploaded.fileName}</span>. Edit
                the fields to match your receipt.
              </span>
            </>
          )}
        </div>
        <ReceiptForm
          mode="create"
          defaultValues={defaults}
          file={{ filePath: uploaded.filePath, fileType: uploaded.fileType }}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <FileDropzone
          onFile={handleFile}
          busy={busy}
          busyLabel={busyLabel}
        />
      </CardContent>
    </Card>
  );
}
