import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getReceipt } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { ReceiptForm } from "@/components/receipt-form";
import { Button } from "@/components/ui/button";
import type { ReceiptValues } from "@/lib/validations";
import type { Category } from "@/lib/categories";

export default async function EditReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receipt = await getReceipt(id);

  if (!receipt) {
    notFound();
  }

  const defaultValues: ReceiptValues = {
    merchant_name: receipt.merchant_name ?? "",
    purchase_date: receipt.purchase_date,
    total_amount: receipt.total_amount,
    category: (receipt.category as Category) ?? "Other",
    payment_method: receipt.payment_method,
    warranty_expiration: receipt.warranty_expiration,
    return_deadline: receipt.return_deadline,
    notes: receipt.notes,
    items: receipt.items.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      warranty_months: i.warranty_months,
    })),
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href={`/receipts/${id}`}>
          <ArrowLeft className="h-4 w-4" />
          Back to receipt
        </Link>
      </Button>

      <PageHeader
        title="Edit receipt"
        description="Update the details for this receipt."
      />

      <ReceiptForm
        mode="edit"
        receiptId={id}
        defaultValues={defaultValues}
      />
    </div>
  );
}
