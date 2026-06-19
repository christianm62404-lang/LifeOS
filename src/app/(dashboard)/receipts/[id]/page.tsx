import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";

import { getReceipt } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { ReceiptActions } from "@/components/receipt-actions";
import { CategoryBadge } from "@/components/category-badge";
import { DeadlineBadge } from "@/components/deadline-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receipt = await getReceipt(id);

  if (!receipt) {
    notFound();
  }

  const fields: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Purchase date", value: formatDate(receipt.purchase_date) },
    { label: "Total amount", value: formatCurrency(receipt.total_amount) },
    { label: "Category", value: <CategoryBadge category={receipt.category} /> },
    { label: "Payment method", value: receipt.payment_method || "—" },
    {
      label: "Warranty expiration",
      value: <DeadlineBadge date={receipt.warranty_expiration} />,
    },
    {
      label: "Return deadline",
      value: <DeadlineBadge date={receipt.return_deadline} />,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/receipts">
          <ArrowLeft className="h-4 w-4" />
          Back to receipts
        </Link>
      </Button>

      <PageHeader
        title={receipt.merchant_name || "Untitled receipt"}
        description={`Added ${formatDate(receipt.created_at)}`}
      >
        <ReceiptActions
          id={receipt.id}
          filePath={receipt.file_url}
          merchant={receipt.merchant_name || "this merchant"}
        />
      </PageHeader>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.label}>
                  <dt className="text-sm text-muted-foreground">{f.label}</dt>
                  <dd className="mt-0.5 font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Line items</CardTitle>
          </CardHeader>
          <CardContent>
            {receipt.items.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No line items recorded for this receipt.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Warranty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipt.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(item.price)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.warranty_months
                          ? `${item.warranty_months} mo`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {receipt.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {receipt.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {receipt.file_url && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              Original file attached. Use{" "}
              <span className="font-medium text-foreground">View file</span> above
              to open it.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
