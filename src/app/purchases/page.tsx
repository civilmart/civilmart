"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Search, Trash2 } from "lucide-react";

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

type Supplier = {
  id: string;
  name: string;
};

type RawMaterial = {
  id: string;
  code: string;
  name: string;
  unitType: "WEIGHT" | "VOLUME" | "PIECE";
};

type PurchaseItem = {
  rawMaterialId: string;
  quantity: string;
  unit: string;
  costPerUnit: string;
  notes: string;
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
  supplier?: Supplier | null;
  items: {
    id: string;
    quantity: number | string;
    unit: string;
    costPerUnit: number | string;
    totalCost: number | string;
    rawMaterial: RawMaterial;
  }[];
};

function getUnits(unitType: RawMaterial["unitType"]) {
  if (unitType === "WEIGHT") return ["G", "KG"];
  if (unitType === "VOLUME") return ["ML", "L"];
  return ["PIECE"];
}

export default function PurchasesPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const [purchaseNo, setPurchaseNo] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [tax, setTax] = useState("");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<PurchaseItem[]>([
    {
      rawMaterialId: "",
      quantity: "",
      unit: "",
      costPerUnit: "",
      notes: "",
    },
  ]);

  async function loadData() {
    try {
      setLoading(true);

      const [suppliersRes, materialsRes, purchasesRes] = await Promise.all([
        fetch("/api/suppliers"),
        fetch("/api/raw-materials"),
        fetch("/api/purchases"),
      ]);

      const suppliersJson = await suppliersRes.json();
      const materialsJson = await materialsRes.json();
      const purchasesJson = await purchasesRes.json();

      setSuppliers(suppliersJson.data || []);
      setRawMaterials(materialsJson.data || []);
      setPurchases(purchasesJson.data || []);
    } catch (error) {
      console.error("Failed to load purchase data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function addItem() {
    setItems([
      ...items,
      {
        rawMaterialId: "",
        quantity: "",
        unit: "",
        costPerUnit: "",
        notes: "",
      },
    ]);
  }

  function removeItem(index: number) {
    if (items.length === 1) return;

    setItems(items.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateItem(
    index: number,
    field: keyof PurchaseItem,
    value: string
  ) {
    const updated = [...items];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    if (field === "rawMaterialId") {
      const material = rawMaterials.find((m) => m.id === value);

      updated[index].unit = material
        ? getUnits(material.unitType)[0]
        : "";
    }

    setItems(updated);
  }

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const cost = Number(item.costPerUnit) || 0;

      return sum + quantity * cost;
    }, 0);
  }, [items]);

  const totalAmount =
    subtotal + (Number(tax) || 0) - (Number(discount) || 0);

  function resetForm() {
    setPurchaseNo("");
    setSupplierId("");
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setTax("");
    setDiscount("");
    setNotes("");

    setItems([
      {
        rawMaterialId: "",
        quantity: "",
        unit: "",
        costPerUnit: "",
        notes: "",
      },
    ]);
  }

  async function handleSave() {
    if (!purchaseNo.trim()) {
      alert("Purchase number is required.");
      return;
    }

    if (items.some((item) => !item.rawMaterialId)) {
      alert("Please select a raw material for every item.");
      return;
    }

    if (
      items.some(
        (item) =>
          !item.quantity ||
          Number(item.quantity) <= 0 ||
          !item.unit ||
          !item.costPerUnit ||
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          purchaseNo,
          supplierId: supplierId || null,
          purchaseDate,
          tax: Number(tax) || 0,
          discount: Number(discount) || 0,
          notes,
          items,
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
        error instanceof Error
          ? error.message
          : "Failed to save purchase."
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredPurchases = purchases.filter((purchase) => {
    const query = search.toLowerCase();

    return (
      purchase.purchaseNo.toLowerCase().includes(query) ||
      purchase.supplier?.name.toLowerCase().includes(query) ||
      purchase.items.some((item) =>
        item.rawMaterial.name.toLowerCase().includes(query)
      )
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
          <p className="text-muted-foreground">
            Manage raw material purchases and receiving.
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
                      placeholder="PUR-2026-001"
                      value={purchaseNo}
                      onChange={(e) => setPurchaseNo(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Supplier</Label>
                    <Select
                      value={supplierId}
                      onValueChange={setSupplierId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>

                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem
                            key={supplier.id}
                            value={supplier.id}
                          >
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
                    const material = rawMaterials.find(
                      (m) => m.id === item.rawMaterialId
                    );

                    const itemTotal =
                      (Number(item.quantity) || 0) *
                      (Number(item.costPerUnit) || 0);

                    return (
                      <Card key={index}>
                        <CardContent className="pt-6">
                          <div className="grid gap-4 md:grid-cols-6">
                            <div className="space-y-2 md:col-span-2">
                              <Label>Raw Material</Label>

                              <Select
                                value={item.rawMaterialId}
                                onValueChange={(value) =>
                                  updateItem(
                                    index,
                                    "rawMaterialId",
                                    value
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select material" />
                                </SelectTrigger>

                                <SelectContent>
                                  {rawMaterials.map((material) => (
                                    <SelectItem
                                      key={material.id}
                                      value={material.id}
                                    >
                                      {material.code} — {material.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Quantity</Label>

                              <Input
                                type="number"
                                min="0"
                                step="0.0001"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(
                                    index,
                                    "quantity",
                                    e.target.value
                                  )
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
                                disabled={!material}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Unit" />
                                </SelectTrigger>

                                <SelectContent>
                                  {material &&
                                    getUnits(material.unitType).map(
                                      (unit) => (
                                        <SelectItem
                                          key={unit}
                                          value={unit}
                                        >
                                          {unit}
                                        </SelectItem>
                                      )
                                    )}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Cost / Unit</Label>

                              <Input
                                type="number"
                                min="0"
                                step="0.0001"
                                value={item.costPerUnit}
                                onChange={(e) =>
                                  updateItem(
                                    index,
                                    "costPerUnit",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <Label>Item Total</Label>
                                <div className="mt-2 rounded-md border px-3 py-2 text-sm font-medium">
                                  PKR {itemTotal.toFixed(2)}
                                </div>
                              </div>

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
                        <span className="font-medium">
                          PKR {subtotal.toFixed(2)}
                        </span>
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
                          onChange={(e) =>
                            setDiscount(e.target.value)
                          }
                          placeholder="0"
                        />
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total</span>
                          <span>PKR {totalAmount.toFixed(2)}</span>
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
            <div className="py-10 text-center text-muted-foreground">
              Loading purchases...
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No purchases found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-3">Purchase No.</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Supplier</th>
                    <th className="p-3">Items</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPurchases.map((purchase) => (
                    <tr
                      key={purchase.id}
                      className="border-b last:border-0"
                    >
                      <td className="p-3 font-medium">
                        {purchase.purchaseNo}
                      </td>

                      <td className="p-3">
                        {new Date(
                          purchase.purchaseDate
                        ).toLocaleDateString()}
                      </td>

                      <td className="p-3">
                        {purchase.supplier?.name || "—"}
                      </td>

                      <td className="p-3">
                        {purchase.items.length}
                      </td>

                      <td className="p-3 font-medium">
                        PKR{" "}
                        {Number(purchase.totalAmount).toFixed(2)}
                      </td>

                      <td className="p-3">
                        <Badge
                          variant={
                            purchase.status === "RECEIVED"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {purchase.status}
                        </Badge>
                      </td>
                    </tr>
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