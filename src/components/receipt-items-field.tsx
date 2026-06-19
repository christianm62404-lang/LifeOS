"use client";

import {
  useFieldArray,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import type { ReceiptValues } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ReceiptItemsField({
  control,
  register,
}: {
  control: Control<ReceiptValues>;
  register: UseFormRegister<ReceiptValues>;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Line items</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({ name: "", quantity: 1, price: null, warranty_months: null })
          }
        >
          <Plus className="h-4 w-4" />
          Add item
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          No line items. Add items to track per-item warranties.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Column headings (desktop) */}
          <div className="hidden grid-cols-12 gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
            <span className="col-span-5">Item</span>
            <span className="col-span-2">Qty</span>
            <span className="col-span-2">Price</span>
            <span className="col-span-2">Warranty (mo)</span>
            <span className="col-span-1" />
          </div>
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-12 gap-2 rounded-md border p-2 sm:border-0 sm:p-0"
            >
              <div className="col-span-12 sm:col-span-5">
                <Input
                  placeholder="Item name"
                  aria-label="Item name"
                  {...register(`items.${index}.name`)}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Input
                  type="number"
                  min={1}
                  placeholder="Qty"
                  aria-label="Quantity"
                  {...register(`items.${index}.quantity`)}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Price"
                  aria-label="Price"
                  {...register(`items.${index}.price`)}
                />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="Months"
                  aria-label="Warranty months"
                  {...register(`items.${index}.warranty_months`)}
                />
              </div>
              <div className="col-span-1 flex items-center justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
