export const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "receipts";

export const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
];

export const ACCEPTED_FILE_EXTENSIONS = ".pdf,.png,.jpg,.jpeg";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/** Warranties / returns within this many days are flagged as "soon". */
export const SOON_THRESHOLD_DAYS = 30;
