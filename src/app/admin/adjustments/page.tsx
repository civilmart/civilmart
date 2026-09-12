"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Minus, Pencil, Plus, SlidersHorizontal } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { PRODUCT_UNITS } from "@/lib/catalog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Product = {
  id: string;
  code: string;
  name: string;
  brand: string | null;
  unit: string;
  price: number | null;
  stockQuantity: number;
  reorderLevel: string | number | null;
  variants: {
    id: string;
    sku: string;
    name: string;
  }[];
};

type FormState = {
  productId: string;
  variantId: string;
  adjustmentType: "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";
  quantity: string;
  unit: string;
  reason: string;
  notes: string;
};

export default function AdjustmentsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState<FormState>({
    productId: "",
    variantId: "",
    adjustmentType: "ADJUSTMENT_IN",
    quantity: "",
    unit: "BAG",
    reason: "",
    notes: "",
  });

  const loadProducts = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/products");
      const data = await response.json();

      if (response.ok) {
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const selectedProduct = products.find(
    (product) => product.id === form.productId
  );

  function startAdjust(product: Product) {
    setForm({
      productId: product.id,
      variantId: "",
      adjustmentType: "ADJUSTMENT_IN",
      quantity: "",
      unit: product.unit,
      reason: "",
      notes: "",
    });
    setEditing(true);
  }

  async function submitAdjustment() {
    if (!form.productId) {
      alert("Please select a product.");
      return;
    }

    const quantity = Number(form.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      alert("Quantity must be greater than zero.");
      return;
    }

    if (!form.reason.trim()) {
      alert("A reason is required.");
      return;
    }

    if (
      form.adjustmentType === "ADJUSTMENT_OUT" &&
      selectedProduct &&
      quantity > Number(selectedProduct.stockQuantity)
    ) {
      alert(
        `Cannot adjust out ${quantity}: only ${selectedProduct.stockQuantity} ${selectedProduct.unit.toLowerCase()} in stock.`
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: form.productId,
          variantId: form.variantId || null,
          adjustmentType: form.adjustmentType,
          quantity,
          unit: form.unit,
          reason: form.reason.trim(),
          notes: form.notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to record adjustment.");
        return;
      }

      alert("Adjustment recorded successfully.");
      setEditing(false);
      setForm({
        productId: "",
        variantId: "",
        adjustmentType: "ADJUSTMENT_IN",
        quantity: "",
        unit: "BAG",
        reason: "",
        notes: "",
      });
      await loadProducts();
    } catch (error) {
      console.error(error);
      alert("Failed to record adjustment.");
    } finally {
      setSaving(false);
    }
  }

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Stock Adjustments</h1>
        </div>
        <p className="text-muted-foreground">
          Manually correct stock levels for damaged, missing or found stock.
        </p>
      </div>

      {editing && selectedProduct && (
        <Card>
          <CardHeader>
            <CardTitle>
              {form.adjustmentType === "ADJUSTMENT_IN" ? "Add" : "Remove"}{" "}
              stock — {selectedProduct.name}
              {selectedProduct.brand ? ` (${selectedProduct.brand})` : ""}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Current stock:{" "}
              <span className="font-semibold text-foreground">
                {formatNumber(Number(selectedProduct.stockQuantity))}{" "}
                {selectedProduct.unit.toLowerCase()}
              </span>
              {selectedProduct.price !== null && (
                <>
                  {" "}
                  · {formatMoney(selectedProduct.price)} /{" "}
                  {selectedProduct.unit.toLowerCase()}
                </>
              )}
            </p>

            {selectedProduct.variants.length > 0 && (
              <div className="space-y-2">
                <Label>Variant (optional)</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.variantId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, variantId: e.target.value }))
                  }
                >
                  <option value="">Product level (no variant)</option>
                  {selectedProduct.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.name} ({variant.sku})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Adjustment Type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.adjustmentType}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      adjustmentType: e.target
                        .value as FormState["adjustmentType"],
                    }))
                  }
                >
                  <option value="ADJUSTMENT_IN">
                    Add stock (in)
                  </option>
                  <option value="ADJUSTMENT_OUT">
                    Remove stock (out)
                  </option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="10"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Unit</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                >
                  {PRODUCT_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Input
                  placeholder="Damaged in storage"
                  value={form.reason}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reason: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="Additional detail..."
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={submitAdjustment} disabled={saving}>
                {form.adjustmentType === "ADJUSTMENT_IN" ? (
                  <Plus className="mr-2 h-4 w-4" />
                ) : (
                  <Minus className="mr-2 h-4 w-4" />
                )}
                {saving
                  ? "Saving..."
                  : form.adjustmentType === "ADJUSTMENT_IN"
                    ? "Add Stock"
                    : "Remove Stock"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Adjust By Product</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No products found.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2 text-right">Stock</th>
                  <th className="px-3 py-2 text-right">Reorder At</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const stock = Number(product.stockQuantity);
                  const reorder = product.reorderLevel
                    ? Number(product.reorderLevel)
                    : null;

                  return (
                    <tr key={product.id} className="border-b hover:bg-muted/40">
                      <td className="px-3 py-3">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.code}
                          {product.brand ? ` · ${product.brand}` : ""}
                        </div>
                      </td>

                      <td className="px-3 py-3">{product.unit}</td>

                      <td className="px-3 py-3 text-right font-medium">
                        {formatNumber(stock)}
                      </td>

                      <td className="px-3 py-3 text-right text-muted-foreground">
                        {reorder !== null ? formatNumber(reorder) : "—"}
                      </td>

                      <td className="px-3 py-3">
                        <Badge
                          variant="outline"
                          className={
                            stock <= 0
                              ? "border-red-200 bg-red-50 text-red-700"
                              : reorder !== null && stock <= reorder
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-green-200 bg-green-50 text-green-700"
                          }
                        >
                          {stock <= 0
                            ? "Out of stock"
                            : reorder !== null && stock <= reorder
                              ? "Low stock"
                              : "In stock"}
                        </Badge>
                      </td>

                      <td className="px-3 py-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => startAdjust(product)}>
                          <Pencil className="mr-1 h-3 w-3" />
                          Adjust
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}