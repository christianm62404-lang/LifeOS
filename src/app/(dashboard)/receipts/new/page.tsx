import { PageHeader } from "@/components/page-header";
import { NewReceipt } from "./new-receipt";

export default function NewReceiptPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Upload receipt"
        description="Upload a PDF or image. We'll extract the details for you to review."
      />
      <NewReceipt />
    </div>
  );
}
