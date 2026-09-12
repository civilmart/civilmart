"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ClipboardList,
  PackageCheck,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
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

type POItem = {
  id: string;
  productId: string;
  variantId: string;
  quantity: number | string;
  receivedQuantity: number | string;
  unit: string;
  estimatedCostPerUnit: number | null;
  notes: string | null;
  product: { id: string; code: string; name: string; unit: string };
  variant: { id: string; sku: string; name: string } | null;
};

type PurchaseOrder = {
  id: string;
  poNumber: string;
  orderDate: string;
  expectedDate: string | null;
  status: string;
  notes: string | null;
  supplier: Supplier | null;
  items: POItem[];
};

type FormItem = {
  productId: string;
  variantId: string;
  quantity: string;
  unit: string;
  estimatedCostPerUnit: string;
  notes: string;
};

type ReceiveFormItem = {
  itemId: string;
  receivedQuantity: string;
  costPerUnit: string;
};

const emptyItem: FormItem = {
  productId: "",
  variantId: "",
  quantity: "",
  unit: "",
  estimatedCostPerUnit: "",
  notes: "",
};

const statusClasses: Record<string, string> = {
  DRAFT: "border-slate-200 bg-slate-100 text-slate-700",
  SENT: "border-blue-200 bg-blue-50 text-blue-700",
  ORDERED: "border-blue-200 bg-blue-50 text-blue-700",
  SUBMITTED: "border-blue-200 bg-blue-50 text-blue-700",
  PARTIALLY_RECEIVED: "border-amber-200 bg-amber-50 text-amber-700",
  RECEIVED: "border-green-200 bg-green-50 text-green-700",
  CANCELLED: "border-red-200 bg-red-50 text-red-700",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ORDERED: "Ordered",
  SUBMITTED: "Submitted",
  PARTIALLY_RECEIVED: "Partially received",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function PurchaseOrdersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [receiving, setReceiving] = useState(false);

  const [poNumber, setPoNumber] = useState(() => `PO-${new Date().getTime()}`);
  const [supplierId, setSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<FormItem[]>([{ ...emptyItem }]);

  const [receivePO, setReceivePO] = useState<PurchaseOrder | null>(null);
  const [receiveItems, setReceiveItems] = useState<ReceiveFormItem[]>([]);

  async function loadData() {
    try {
      const [productsRes, suppliersRes, ordersRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/suppliers"),
        fetch("/api/purchase-orders"),
      ]);

      const productsJson = await productsRes.json();
      const suppliersJson = await suppliersRes.json();
      const ordersJson = await ordersRes.json();

      setProducts(
        Array.isArray(productsJson) ? productsJson : productsJson.data ?? []
      );
      setSuppliers(suppliersJson.data ?? []);
      setPurchaseOrders(
        Array.isArray(ordersJson) ? ordersJson : ordersJson.data ?? []
      );
    } catch (error) {
      console.error("Failed to load purchase order data:", error);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setPoNumber(`PO-${new Date().getTime()}`);
    setSupplierId("");
    setOrderDate(new Date().toISOString().split("T")[0]);
    setExpectedDate("");
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

  const estimatedTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const cost = Number(item.estimatedCostPerUnit) || 0;
      return sum + quantity * cost;
    }, 0);
  }, [items]);

  async function savePurchaseOrder() {
    if (!poNumber.trim()) {
      alert("PO number is required.");
      return;
    }

    if (items.some((item) => !item.productId)) {
      alert("Please select a product for every item.");
      return;
    }

    if (items.some((item) => !item.quantity || Number(item.quantity) <= 0)) {
      alert("Please enter a valid quantity for every item.");
      return;
    }

    if (items.some((item) => !item.unit)) {
      alert("Please select a unit for every item.");
      return;
    }

    if (
      items.some(
        (item) =>
          item.estimatedCostPerUnit !== "" &&
          (Number(item.estimatedCostPerUnit) < 0 ||
            !Number.isFinite(Number(item.estimatedCostPerUnit)))
      )
    ) {
      alert("Estimated cost cannot be negative.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poNumber,
          supplierId: supplierId || null,
          orderDate,
          expectedDate: expectedDate || null,
          notes: notes || null,
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: Number(item.quantity),
            unit: item.unit,
            estimatedCostPerUnit:
              item.estimatedCostPerUnit === ""
                ? null
                : Number(item.estimatedCostPerUnit),
            notes: item.notes || null,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to save purchase order.");
        return;
      }

      alert("Purchase order saved successfully.");

      resetForm();
      setShowForm(false);
      await loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to save purchase order.");
    } finally {
      setSaving(false);
    }
  }

  function openReceiveDialog(order: PurchaseOrder) {
    const remainingItems = order.items
      .map((item) => {
        const remaining =
          Number(item.quantity) - Number(item.receivedQuantity || 0);

        if (remaining <= 0) return null;

        return {
          itemId: item.id,
          receivedQuantity: String(remaining),
          costPerUnit:
            item.estimatedCostPerUnit !== null
              ? String(item.estimatedCostPerUnit)
              : "",
        };
      })
      .filter((item): item is ReceiveFormItem => item !== null);

    if (remainingItems.length === 0) {
      alert("Nothing left to receive on this purchase order.");
      return;
    }

    setReceivePO(order);
    setReceiveItems(remainingItems);
  }

  function updateReceiveItem(
    itemId: string,
    field: keyof ReceiveFormItem,
    value: string
  ) {
    setReceiveItems((current) =>
      current.map((item) =>
        item.itemId === itemId ? { ...item, [field]: value } : item
      )
    );
  }

  async function receivePurchaseOrder() {
    if (!receivePO) return;

    const itemsToReceive = receiveItems.filter(
      (item) => item.receivedQuantity && Number(item.receivedQuantity) > 0
    );

    if (itemsToReceive.length === 0) {
      alert("Enter a received quantity for at least one item.");
      return;
    }

    for (const receiveItem of itemsToReceive) {
      const poItem = receivePO.items.find(
        (item) => item.id === receiveItem.itemId
      );

      if (!poItem) continue;

      const remaining =
        Number(poItem.quantity) - Number(poItem.receivedQuantity || 0);
      const received = Number(receiveItem.receivedQuantity);

      if (received > remaining) {
        alert(
          `${poItem.product.name}: only ${formatNumber(remaining)} ${poItem.unit} remains to be received.`
        );
        return;
      }
    }

    setReceiving(true);

    try {
      const response = await fetch(`/api/purchase-orders/${receivePO.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsToReceive.map((item) => ({
            itemId: item.itemId,
            receivedQuantity: Number(item.receivedQuantity),
            costPerUnit:
              item.costPerUnit === ""
                ? null
                : Number(item.costPerUnit),
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to receive purchase order.");
        return;
      }

      alert(`Receipt saved successfully.\nPurchase: ${data.purchaseNo}`);

      setReceivePO(null);
      setReceiveItems([]);
      await loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to receive purchase order.");
    } finally {
      setReceiving(false);
    }
  }

  const filteredOrders = purchaseOrders.filter((order) => {
    const term = search.toLowerCase();

    return (
      order.poNumber.toLowerCase().includes(term) ||
      (order.supplier?.name ?? "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Purchase Orders</h1>
          </div>
          <p className="text-muted-foreground">
            Create, receive, and manage product purchase orders.
          </p>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setReceivePO(null);
            setShowForm(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Purchase Order
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Purchase Order</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>PO Number</Label>
                <Input
                  placeholder={`PO-${new Date().getTime()}`}
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
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
                <Label>Order Date</Label>
                <Input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Expected Date</Label>
                <Input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Order Items</h2>
                <Button variant="outline" onClick={addItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              {items.map((item, index) => {
                const product = products.find((p) => p.id === item.productId);
                const lineTotal =
                  (Number(item.quantity) || 0) *
                  (Number(item.estimatedCostPerUnit) || 0);

                return (
                  <div key={index} className="rounded-lg border p-4">
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
                              {product.code} — {product.name} ({product.unit}
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
                          disabled={
                            !product || product.variants.length === 0
                          }
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
                          step="0.01"
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

                    <div className="mt-4 grid gap-4 md:grid-cols-4">
                      <div className="space-y-2">
                        <Label>Est. Cost / Unit</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.estimatedCostPerUnit}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "estimatedCostPerUnit",
                              e.target.value
                            )
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
                        <div>
                          <Label>Est. Total</Label>
                          <p className="mt-2 font-semibold">
                            {formatMoney(lineTotal)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-end justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="rounded-lg border bg-muted/30 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Estimated Order Total
                  </span>
                  <span className="text-2xl font-bold">
                    {formatMoney(estimatedTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={savePurchaseOrder} disabled={saving}>
                {saving ? "Saving..." : "Save Purchase Order"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Purchase Order History</CardTitle>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search PO or supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No purchase orders found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">PO No.</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Supplier</th>
                    <th className="px-3 py-2">Items</th>
                    <th className="px-3 py-2">Expected</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Received</th>
                    <th className="px-3 py-2"></th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => {
                    const totalOrdered = order.items.reduce(
                      (sum, item) => sum + Number(item.quantity),
                      0
                    );
                    const totalReceived = order.items.reduce(
                      (sum, item) => sum + Number(item.receivedQuantity || 0),
                      0
                    );
                    const hasRemaining = order.items.some(
                      (item) =>
                        Number(item.receivedQuantity || 0) < Number(item.quantity)
                    );

                    return (
                      <Fragment key={order.id}>
                        <tr className="border-b hover:bg-muted/40">
                          <td className="px-3 py-3 font-medium">
                            {order.poNumber}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {formatDate(order.orderDate)}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {order.supplier?.name || "—"}
                          </td>
                          <td className="px-3 py-3">{order.items.length}</td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {order.expectedDate
                              ? formatDate(order.expectedDate)
                              : "—"}
                          </td>
                          <td className="px-3 py-3">
                            <Badge
                              variant="outline"
                              className={
                                statusClasses[order.status] ??
                                "border-border bg-muted text-muted-foreground"
                              }
                            >
                              {statusLabels[order.status] ??
                                order.status.replace("_", " ").toLowerCase()}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="font-medium">
                              {formatNumber(totalReceived)}
                              <span className="text-muted-foreground">
                                {" "}
                                / {formatNumber(totalOrdered)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setExpandedId(
                                  expandedId === order.id ? null : order.id
                                )
                              }
                            >
                              <ChevronDown
                                className={`mr-1 h-4 w-4 transition-transform ${
                                  expandedId === order.id ? "rotate-180" : ""
                                }`}
                              />
                              Details
                            </Button>
                          </td>
                          <td className="px-3 py-3">
                            {hasRemaining &&
                              order.status !== "CANCELLED" &&
                              order.status !== "RECEIVED" && (
                                <Button
                                  onClick={() => openReceiveDialog(order)}
                                >
                                  <PackageCheck className="mr-2 h-4 w-4" />
                                  Receive
                                </Button>
                              )}
                          </td>
                        </tr>

                        {expandedId === order.id && (
                          <tr key={`${order.id}-details`}>
                            <td colSpan={9} className="bg-muted/30 px-4 py-3">
                              <div className="max-h-80 overflow-auto">
                                <table className="w-full text-left text-sm">
                                  <thead>
                                    <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                                      <th className="px-3 py-2">Product</th>
                                      <th className="px-3 py-2">Variant</th>
                                      <th className="px-3 py-2 text-right">
                                        Ordered
                                      </th>
                                      <th className="px-3 py-2 text-right">
                                        Received
                                      </th>
                                      <th className="px-3 py-2">Progress</th>
                                      <th className="px-3 py-2 text-right">
                                        Est. Cost / Unit
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {order.items.map((item) => {
                                      const ordered = Number(item.quantity);
                                      const received = Number(
                                        item.receivedQuantity || 0
                                      );

                                      return (
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
                                            {formatNumber(ordered)}
                                          </td>
                                          <td className="px-3 py-2 text-right">
                                            {formatNumber(received)}
                                          </td>
                                          <td className="px-3 py-2 font-medium">
                                            {formatNumber(received)} of{" "}
                                            {formatNumber(ordered)} {item.unit}
                                          </td>
                                          <td className="px-3 py-2 text-right text-muted-foreground">
                                            {item.estimatedCostPerUnit !== null
                                              ? formatMoney(
                                                  Number(
                                                    item.estimatedCostPerUnit
                                                  )
                                                )
                                              : "—"}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={receivePO !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReceivePO(null);
            setReceiveItems([]);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Receive Purchase Order
              {receivePO
                ? ` — ${receivePO.poNumber}${receivePO.supplier ? ` (${receivePO.supplier.name})` : ""}`
                : ""}
            </DialogTitle>
          </DialogHeader>

          {receivePO && (
            <div className="space-y-4">
              {receivePO.items.map((poItem) => {
                const ordered = Number(poItem.quantity);
                const alreadyReceived = Number(poItem.receivedQuantity || 0);
                const remaining = ordered - alreadyReceived;

                if (remaining <= 0) return null;

                const receiveItem = receiveItems.find(
                  (item) => item.itemId === poItem.id
                );

                if (!receiveItem) return null;

                return (
                  <div
                    key={poItem.id}
                    className="rounded-lg border p-4"
                  >
                    <div className="mb-4">
                      <p className="font-semibold">
                        {poItem.product.code} — {poItem.product.name}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>
                          Ordered:{" "}
                          <strong className="text-foreground">
                            {formatNumber(ordered)} {poItem.unit}
                          </strong>
                        </span>
                        <span>
                          Received:{" "}
                          <strong className="text-foreground">
                            {formatNumber(alreadyReceived)} {poItem.unit}
                          </strong>
                        </span>
                        <span>
                          Remaining:{" "}
                          <strong className="text-foreground">
                            {formatNumber(remaining)} {poItem.unit}
                          </strong>
                        </span>
                        <span>
                          Variant:{" "}
                          <strong className="text-foreground">
                            {poItem.variant
                              ? `${poItem.variant.name} (${poItem.variant.sku})`
                              : "None"}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Receive Qty</Label>
                        <Input
                          type="number"
                          min="0"
                          max={remaining}
                          step="0.01"
                          value={receiveItem.receivedQuantity}
                          onChange={(e) =>
                            updateReceiveItem(
                              poItem.id,
                              "receivedQuantity",
                              e.target.value
                            )
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Max: {formatNumber(remaining)} {poItem.unit}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Cost / Unit</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={receiveItem.costPerUnit}
                          onChange={(e) =>
                            updateReceiveItem(
                              poItem.id,
                              "costPerUnit",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <p className="font-medium">Receiving workflow</p>
                <p className="mt-1 text-muted-foreground">
                  Saving this receipt will create the Purchase and inventory
                  transactions automatically.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReceivePO(null);
                    setReceiveItems([]);
                  }}
                  disabled={receiving}
                >
                  Cancel
                </Button>
                <Button onClick={receivePurchaseOrder} disabled={receiving}>
                  <PackageCheck className="mr-2 h-4 w-4" />
                  {receiving ? "Receiving..." : "Receive Purchase Order"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}