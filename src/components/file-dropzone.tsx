"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileText, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ACCEPTED_FILE_EXTENSIONS,
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/constants";

export function FileDropzone({
  onFile,
  disabled,
  busy,
  busyLabel,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
  busy?: boolean;
  busyLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validateAndSend(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setError("Unsupported file type. Upload a PDF, PNG or JPG.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("File is too large (max 10 MB).");
      return;
    }
    onFile(file);
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          validateAndSend(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          (disabled || busy) && "cursor-not-allowed opacity-70",
        )}
      >
        {busy ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm font-medium">{busyLabel ?? "Processing…"}</p>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <UploadCloud className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, PNG or JPG (max 10 MB)
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              We&apos;ll auto-extract the details for you
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_FILE_EXTENSIONS}
          className="hidden"
          onChange={(e) => validateAndSend(e.target.files?.[0])}
        />
      </button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
