"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ProductVariant = {
  id: string;
  sku: string;
  name: string;
  sizeValue: number;
  sizeUnit: string;
  price: number | null;
};

type Product = {
  id: string;
  code: string;
  name: string;
  brand: string | null;
  unit: string;
  price: number | null;
  stockQuantity: number;
  status: string;
  category: { id: string; name: string } | null;
  variants: ProductVariant[];
};

type Supplier = {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
};

type PurchaseItem = {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number | string;
  unit: string;
  costPerUnit: number | string;
  totalCost: number | string;
  notes: string | null;
  product: { id: string; code: string; name: string; unit: string };
  variant: { id: string; sku: string; name: string } | null;
};

type Purchase = {
  id: string;
  purchaseNo: string;
  purchaseDate: string;
  status: string;
  subtotal: number | string;
  tax: number | string;
  discount: number | string;
  totalAmount: number | string;
  notes: string | null;
  supplier: Supplier | null;
  items: PurchaseItem[];
};

type FormItem = {
  productId: string;
  variantId: string;
  quantity: string;
  unit: string;
  costPerUnit: string;
  notes: string;
};

const emptyItem: FormItem = {
  productId: "",
  variantId: "",
  quantity: "",
  unit: "",
  costPerUnit: "",
  notes: "",
};

const statusClasses: Record<string, string> = {
  RECEIVED: "border-green-200 bg-green-50 text-green-700",
};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function PurchasesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [purchaseNo, setPurchaseNo] = useState(() => `PUR-${new Date().getTime()}`);
  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [tax, setTax] = useState("");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<FormItem[]>([{ ...emptyItem }]);

  async function loadData() {
    setLoading(true);

    try {
      const [productsRes, suppliersRes, purchasesRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/suppliers"),
        fetch("/api/purchases"),
      ]);

      const productsJson = await productsRes.json();
      const suppliersJson = await suppliersRes.json();
      const purchasesJson = await purchasesRes.json();

      setProducts(
        Array.isArray(productsJson) ? productsJson : productsJson.data ?? []
      );
      setSuppliers(suppliersJson.data ?? []);
      setPurchases(purchasesJson.data ?? []);
    } catch (error) {
      console.error("Failed to load purchase data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setPurchaseNo(`PUR-${new Date().getTime()}`);
    setSupplierId("");
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setTax("");
    setDiscount("");
    setNotes("");
    setItems([{ ...emptyItem }]);
  }

  function addItem() {
    setItems((current) => [...current, { ...emptyItem }]);
  }

  function removeItem(index: number) {
    setItems((current) => {
      if (current.length === 1) return current;
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function updateItem(index: number, field: keyof FormItem, value: string) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const updated = { ...item, [field]: value };

        if (field === "productId") {
          const product = products.find((p) => p.id === value);
          updated.variantId = "";
          updated.unit = product ? product.unit : "";
        }

        return updated;
      })
    );
  }

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const cost = Number(item.costPerUnit) || 0;
      return sum + quantity * cost;
    }, 0);
  }, [items]);

  const totalAmount = subtotal + (Number(tax) || 0) - (Number(discount) || 0);

  async function handleSave() {
    if (!purchaseNo.trim()) {
      alert("Purchase number is required.");
      return;
    }

    if (items.some((item) => !item.productId)) {
      alert("Please select a product for every item.");
      return;
    }

    if (
      items.some(
        (item) =>
          !item.quantity ||
          Number(item.quantity) <= 0 ||
          !item.unit ||
          item.costPerUnit === "" ||
          Number(item.costPerUnit) < 0
      )
    ) {
      alert("Please enter valid quantity, unit, and cost for every item.");
      return;
    }

    if ((Number(tax) || 0) < 0 || (Number(discount) || 0) < 0) {
      alert("Tax and discount cannot be negative.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseNo,
          supplierId: supplierId || null,
          purchaseDate,
          tax: Number(tax) || 0,
          discount: Number(discount) || 0,
          notes: notes || null,
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: Number(item.quantity),
            unit: item.unit,
            costPerUnit: Number(item.costPerUnit),
            notes: item.notes || null,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create purchase");
      }

      alert("Purchase saved successfully.");

      setOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error("Failed to save purchase:", error);
      alert(
        error instanceof Error ? error.message : "Failed to save purchase."
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredPurchases = purchases.filter((purchase) => {
    const query = search.toLowerCase();

    return (
      purchase.purchaseNo.toLowerCase().includes(query) ||
      (purchase.supplier?.name ?? "").toLowerCase().includes(query) ||
      purchase.items.some((item) =>
        item.product.name.toLowerCase().includes(query)
      )
    );
  });

  const totalSpend = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.totalAmount),
    0
  );

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
          <p className="text-muted-foreground">
            Manage product purchases and receiving.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Purchase
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Purchase</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Purchase Number</Label>
                    <Input
                      placeholder={`PUR-${new Date().getTime()}`}
                      value={purchaseNo}
                      onChange={(e) => setPurchaseNo(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Supplier</Label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Purchase Date</Label>
                    <Input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Purchase Items</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addItem}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  </div>

                  {items.map((item, index) => {
                    const product = products.find((p) => p.id === item.productId);
                    const itemTotal =
                      (Number(item.quantity) || 0) *
                      (Number(item.costPerUnit) || 0);

                    return (
                      <Card key={index}>
                        <CardContent className="space-y-4 pt-6">
                          <div className="grid gap-4 md:grid-cols-6">
                            <div className="space-y-2 md:col-span-2">
                              <Label>Product</Label>
                              <select
                                className={selectClass}
                                value={item.productId}
                                onChange={(e) =>
                                  updateItem(index, "productId", e.target.value)
                                }
                              >
                                <option value="">Select product</option>
                                {products.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.code} — {product.name} (
                                    {product.unit}
                                    {product.price !== null
                                      ? ` · ${formatMoney(product.price)}`
                                      : ""}
                                    )
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                              <Label>Variant</Label>
                              <select
                                className={selectClass}
                                value={item.variantId}
                                disabled={!product || product.variants.length === 0}
                                onChange={(e) =>
                                  updateItem(index, "variantId", e.target.value)
                                }
                              >
                                <option value="">No variant</option>
                                {product?.variants.map((variant) => (
                                  <option key={variant.id} value={variant.id}>
                                    {variant.name} ({variant.sku})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-2">
                              <Label>Quantity</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.0001"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(index, "quantity", e.target.value)
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Unit</Label>
                              <Select
                                value={item.unit}
                                onValueChange={(value) =>
                                  updateItem(index, "unit", value)
                                }
                                disabled={!product}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  {PRODUCT_UNITS.map((unit) => (
                                    <SelectItem key={unit} value={unit}>
                                      {unit}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-4">
                            <div className="space-y-2">
                              <Label>Cost / Unit</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.0001"
                                value={item.costPerUnit}
                                onChange={(e) =>
                                  updateItem(index, "costPerUnit", e.target.value)
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Item Notes</Label>
                              <Input
                                placeholder="Optional"
                                value={item.notes}
                                onChange={(e) =>
                                  updateItem(index, "notes", e.target.value)
                                }
                              />
                            </div>

                            <div className="flex items-end">
                              <div className="flex-1">
                                <Label>Item Total</Label>
                                <div className="mt-2 rounded-md border px-3 py-2 text-sm font-medium">
                                  {formatMoney(itemTotal)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-end justify-end">
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => removeItem(index)}
                                disabled={items.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Optional purchase notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <Card>
                    <CardContent className="space-y-4 pt-6">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="font-medium">{formatMoney(subtotal)}</span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <Label>Tax</Label>
                        <Input
                          className="w-40"
                          type="number"
                          min="0"
                          step="0.01"
                          value={tax}
                          onChange={(e) => setTax(e.target.value)}
                          placeholder="0"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <Label>Discount</Label>
                        <Input
                          className="w-40"
                          type="number"
                          min="0"
                          step="0.01"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                          placeholder="0"
                        />
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total</span>
                          <span>{formatMoney(totalAmount)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Purchase"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Purchases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchases.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totalSpend)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Purchase History</CardTitle>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search purchases..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No purchases found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Purchase No.</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Supplier</th>
                    <th className="px-3 py-2">Items</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                    <th className="px-3 py-2 text-right">Tax</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPurchases.map((purchase) => (
                    <Fragment key={purchase.id}>
                      <tr className="border-b hover:bg-muted/40">
                        <td className="px-3 py-3 font-medium">
                          {purchase.purchaseNo}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {new Date(purchase.purchaseDate).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-3">
                          {purchase.supplier?.name || "—"}
                        </td>
                        <td className="px-3 py-3">{purchase.items.length}</td>
                        <td className="px-3 py-3 text-right">
                          {formatMoney(Number(purchase.subtotal))}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {formatMoney(Number(purchase.tax))}
                        </td>
                        <td className="px-3 py-3 text-right font-medium">
                          {formatMoney(Number(purchase.totalAmount))}
                        </td>
                        <td className="px-3 py-3">
                          <Badge
                            variant="outline"
                            className={statusClasses[purchase.status] ?? ""}
                          >
                            {purchase.status.replace("_", " ").toLowerCase()}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setExpandedId(
                                expandedId === purchase.id ? null : purchase.id
                              )
                            }
                          >
                            <ChevronDown
                              className={`mr-1 h-4 w-4 transition-transform ${
                                expandedId === purchase.id ? "rotate-180" : ""
                              }`}
                            />
                            Details
                          </Button>
                        </td>
                      </tr>

                      {expandedId === purchase.id && (
                        <tr key={`${purchase.id}-details`}>
                          <td
                            colSpan={9}
                            className="bg-muted/30 px-4 py-3"
                          >
                            <div className="max-h-80 overflow-auto">
                              <table className="w-full text-left text-sm">
                                <thead>
                                  <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                                    <th className="px-3 py-2">Product</th>
                                    <th className="px-3 py-2">Variant</th>
                                    <th className="px-3 py-2 text-right">Quantity</th>
                                    <th className="px-3 py-2">Unit</th>
                                    <th className="px-3 py-2 text-right">Cost / Unit</th>
                                    <th className="px-3 py-2 text-right">Total</th>
                                    <th className="px-3 py-2">Notes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {purchase.items.map((item) => (
                                    <tr key={item.id} className="border-b">
                                      <td className="px-3 py-2">
                                        <div className="font-medium">
                                          {item.product.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {item.product.code}
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 text-muted-foreground">
                                        {item.variant
                                          ? `${item.variant.name} (${item.variant.sku})`
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        {formatNumber(Number(item.quantity))}
                                      </td>
                                      <td className="px-3 py-2">{item.unit}</td>
                                      <td className="px-3 py-2 text-right">
                                        {formatMoney(Number(item.costPerUnit))}
                                      </td>
                                      <td className="px-3 py-2 text-right font-medium">
                                        {formatMoney(Number(item.totalCost))}
                                      </td>
                                      <td className="px-3 py-2 text-muted-foreground">
                                        {item.notes || "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}