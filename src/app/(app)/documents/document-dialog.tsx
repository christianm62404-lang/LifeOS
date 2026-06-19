"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Upload } from "lucide-react";
import { DOCUMENT_TYPES, labelize, type DocumentType } from "@/lib/constants";
import { documentSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createDocument } from "./actions";

export function DocumentDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [docType, setDocType] = useState<DocumentType>("other");
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("documentType", docType);

    // Client-side validation of the metadata before uploading.
    const check = documentSchema.safeParse({
      title: formData.get("title"),
      documentType: docType,
      expirationDate: formData.get("expirationDate"),
      notes: formData.get("notes"),
    });
    if (!check.success) {
      toast({
        variant: "destructive",
        title: "Check the form",
        description: check.error.issues[0]?.message,
      });
      return;
    }

    setSubmitting(true);
    const result = await createDocument(formData);
    setSubmitting(false);

    if (result.ok) {
      toast({ variant: "success", title: result.message ?? "Saved" });
      setOpen(false);
      setDocType("other");
      formRef.current?.reset();
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: result.error,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" /> Add document
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add document</DialogTitle>
          <DialogDescription>
            Store important documents securely and track expiry dates.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Passport — Jane Doe"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Document type</Label>
              <Select
                value={docType}
                onValueChange={(v) => setDocType(v as DocumentType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {labelize(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expirationDate">Expiration date</Label>
              <Input id="expirationDate" name="expirationDate" type="date" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">File (optional, max 10 MB)</Label>
            <Input
              id="file"
              name="file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt"
            />
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Upload className="h-3 w-3" /> Stored privately in Supabase
              Storage.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Policy number, renewal info…"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save document
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
