"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  PackageCheck,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

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

type POItem = {
  id: string;
  rawMaterialId: string;
  quantity: number;
  receivedQuantity: number;
  unit: string;
  estimatedCostPerUnit: number | null;
  rawMaterial: RawMaterial;
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
  rawMaterialId: string;
  quantity: string;
  unit: string;
  estimatedCostPerUnit: string;
  notes: string;
};

type ReceiveFormItem = {
  itemId: string;
  receivedQuantity: string;
  costPerUnit: string;
  lotNumber: string;
  expiryDate: string;
};

const emptyItem: FormItem = {
  rawMaterialId: "",
  quantity: "",
  unit: "",
  estimatedCostPerUnit: "",
  notes: "",
};

function unitsForType(unitType?: RawMaterial["unitType"]) {
  if (unitType === "WEIGHT") return ["G", "KG"];
  if (unitType === "VOLUME") return ["ML", "L"];
  if (unitType === "PIECE") return ["PIECE"];
  return [];
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString();
}

function statusVariant(status: string) {
  if (status === "APPROVED") return "default";
  if (status === "RECEIVED") return "default";
  if (status === "PARTIALLY_RECEIVED") return "default";
  if (status === "CANCELLED") return "destructive";
  return "secondary";
}

export default function PurchaseOrdersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [showReceiveForm, setShowReceiveForm] = useState(false);

  const [selectedPO, setSelectedPO] =
    useState<PurchaseOrder | null>(null);

  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [receiving, setReceiving] = useState(false);

  const [poNumber, setPoNumber] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<FormItem[]>([
    { ...emptyItem },
  ]);

  const [receiveItems, setReceiveItems] = useState<
    ReceiveFormItem[]
  >([]);

  const loadData = async () => {
    try {
      const [suppliersRes, materialsRes, ordersRes] =
        await Promise.all([
          fetch("/api/suppliers"),
          fetch("/api/raw-materials"),
          fetch("/api/purchase-orders"),
        ]);

      const suppliersJson = await suppliersRes.json();
      const materialsJson = await materialsRes.json();
      const ordersJson = await ordersRes.json();

      setSuppliers(suppliersJson.data ?? []);
      setRawMaterials(materialsJson.data ?? []);

      setPurchaseOrders(
        Array.isArray(ordersJson)
          ? ordersJson
          : ordersJson.data ?? []
      );
    } catch (error) {
      console.error(
        "Failed to load purchase order data:",
        error
      );
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setPoNumber("");
    setSupplierId("");
    setOrderDate(
      new Date().toISOString().split("T")[0]
    );
    setExpectedDate("");
    setNotes("");
    setItems([{ ...emptyItem }]);
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { ...emptyItem },
    ]);
  }

  function removeItem(index: number) {
    setItems((current) => {
      if (current.length === 1) return current;

      return current.filter(
        (_, itemIndex) => itemIndex !== index
      );
    });
  }

  function updateItem(
    index: number,
    field: keyof FormItem,
    value: string
  ) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const updated = {
          ...item,
          [field]: value,
        };

        if (field === "rawMaterialId") {
          const material = rawMaterials.find(
            (rm) => rm.id === value
          );

          updated.unit =
            unitsForType(material?.unitType)[0] ?? "";
        }

        return updated;
      })
    );
  }

  const estimatedTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const cost =
        Number(item.estimatedCostPerUnit) || 0;

      return sum + quantity * cost;
    }, 0);
  }, [items]);

  async function savePurchaseOrder() {
    if (!poNumber.trim()) {
      alert("PO number is required.");
      return;
    }

    if (
      items.some(
        (item) => !item.rawMaterialId
      )
    ) {
      alert(
        "Please select a raw material for every item."
      );
      return;
    }

    if (
      items.some(
        (item) =>
          !item.quantity ||
          Number(item.quantity) <= 0
      )
    ) {
      alert(
        "Please enter a valid quantity for every item."
      );
      return;
    }

    if (items.some((item) => !item.unit)) {
      alert(
        "Please select a unit for every item."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/purchase-orders",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            poNumber,
            supplierId: supplierId || null,
            orderDate,
            expectedDate:
              expectedDate || null,
            notes,
            items,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            "Failed to save purchase order."
        );
        return;
      }

      alert(
        "PURCHASE ORDER SAVED SUCCESSFULLY."
      );

      resetForm();
      setShowForm(false);

      await loadData();
    } catch (error) {
      console.error(error);
      alert(
        "Failed to save purchase order."
      );
    } finally {
      setSaving(false);
    }
  }

  function openReceiveForm(order: PurchaseOrder) {
    setSelectedPO(order);

    const formItems = order.items
      .map((item) => {
        const remaining =
          Number(item.quantity) -
          Number(item.receivedQuantity || 0);

        if (remaining <= 0) {
          return null;
        }

        return {
          itemId: item.id,
          receivedQuantity: "",
          costPerUnit:
            item.estimatedCostPerUnit !== null
              ? String(
                  item.estimatedCostPerUnit
                )
              : "",
          lotNumber: "",
          expiryDate: "",
        };
      })
      .filter(
        (item): item is ReceiveFormItem =>
          item !== null
      );

    setReceiveItems(formItems);
    setShowReceiveForm(true);
    setShowForm(false);
  }

  function updateReceiveItem(
    itemId: string,
    field: keyof ReceiveFormItem,
    value: string
  ) {
    setReceiveItems((current) =>
      current.map((item) =>
        item.itemId === itemId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  async function receivePurchaseOrder() {
    if (!selectedPO) return;

    const itemsToReceive = receiveItems.filter(
      (item) =>
        item.receivedQuantity &&
        Number(item.receivedQuantity) > 0
    );

    if (itemsToReceive.length === 0) {
      alert(
        "Enter a received quantity for at least one item."
      );
      return;
    }

    for (const receiveItem of itemsToReceive) {
      const poItem = selectedPO.items.find(
        (item) =>
          item.id === receiveItem.itemId
      );

      if (!poItem) continue;

      const remaining =
        Number(poItem.quantity) -
        Number(poItem.receivedQuantity || 0);

      const received = Number(
        receiveItem.receivedQuantity
      );

      if (received > remaining) {
        alert(
          `${poItem.rawMaterial.name}: only ${remaining} ${poItem.unit} remains to be received.`
        );
        return;
      }

      if (
        !receiveItem.costPerUnit ||
        Number(receiveItem.costPerUnit) < 0
      ) {
        alert(
          `Please enter a valid cost per unit for ${poItem.rawMaterial.name}.`
        );
        return;
      }
    }

    setReceiving(true);

    try {
      const response = await fetch(
        `/api/purchase-orders/${selectedPO.id}/receive`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: itemsToReceive.map(
              (item) => ({
                itemId: item.itemId,
                receivedQuantity:
                  Number(
                    item.receivedQuantity
                  ),
                costPerUnit:
                  item.costPerUnit
                    ? Number(
                        item.costPerUnit
                      )
                    : null,
                lotNumber:
                  item.lotNumber || null,
                expiryDate:
                  item.expiryDate || null,
              })
            ),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            "Failed to receive purchase order."
        );
        return;
      }

      alert(
        `RECEIPT SAVED SUCCESSFULLY.\nPurchase: ${data.purchaseNo}`
      );

      setShowReceiveForm(false);
      setSelectedPO(null);
      setReceiveItems([]);

      await loadData();
    } catch (error) {
      console.error(error);

      alert(
        "Failed to receive purchase order."
      );
    } finally {
      setReceiving(false);
    }
  }

  const filteredOrders =
    purchaseOrders.filter((order) => {
      const term = search.toLowerCase();

      return (
        order.poNumber
          .toLowerCase()
          .includes(term) ||
        order.supplier?.name
          .toLowerCase()
          .includes(term)
      );
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />

            <h1 className="text-2xl font-bold">
              Purchase Orders
            </h1>
          </div>

          <p className="text-muted-foreground">
            Create, receive, and manage raw-material
            purchase orders.
          </p>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setShowReceiveForm(false);
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
            <CardTitle>
              Create Purchase Order
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>PO Number</Label>

                <Input
                  placeholder="PO-2026-001"
                  value={poNumber}
                  onChange={(e) =>
                    setPoNumber(e.target.value)
                  }
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
                    {suppliers.map(
                      (supplier) => (
                        <SelectItem
                          key={supplier.id}
                          value={supplier.id}
                        >
                          {supplier.name}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Order Date</Label>

                <Input
                  type="date"
                  value={orderDate}
                  onChange={(e) =>
                    setOrderDate(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Expected Date
                </Label>

                <Input
                  type="date"
                  value={expectedDate}
                  onChange={(e) =>
                    setExpectedDate(
                      e.target.value
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">
                  Order Items
                </h2>

                <Button
                  variant="outline"
                  onClick={addItem}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              {items.map(
                (item, index) => {
                  const material =
                    rawMaterials.find(
                      (rm) =>
                        rm.id ===
                        item.rawMaterialId
                    );

                  const units =
                    unitsForType(
                      material?.unitType
                    );

                  const lineTotal =
                    (Number(
                      item.quantity
                    ) || 0) *
                    (Number(
                      item.estimatedCostPerUnit
                    ) || 0);

                  return (
                    <div
                      key={index}
                      className="rounded-lg border p-4"
                    >
                      <div className="grid gap-4 md:grid-cols-6">
                        <div className="space-y-2 md:col-span-2">
                          <Label>
                            Raw Material
                          </Label>

                          <Select
                            value={
                              item.rawMaterialId
                            }
                            onValueChange={(
                              value
                            ) =>
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
                              {rawMaterials.map(
                                (rm) => (
                                  <SelectItem
                                    key={
                                      rm.id
                                    }
                                    value={
                                      rm.id
                                    }
                                  >
                                    {rm.code} —{" "}
                                    {rm.name}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>
                            Quantity
                          </Label>

                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              item.quantity
                            }
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
                          <Label>
                            Unit
                          </Label>

                          <Select
                            value={
                              item.unit
                            }
                            onValueChange={(
                              value
                            ) =>
                              updateItem(
                                index,
                                "unit",
                                value
                              )
                            }
                            disabled={
                              !material
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>

                            <SelectContent>
                              {units.map(
                                (unit) => (
                                  <SelectItem
                                    key={
                                      unit
                                    }
                                    value={
                                      unit
                                    }
                                  >
                                    {unit}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>
                            Est. Cost / Unit
                          </Label>

                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              item.estimatedCostPerUnit
                            }
                            onChange={(e) =>
                              updateItem(
                                index,
                                "estimatedCostPerUnit",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="flex items-end justify-between gap-2">
                          <div>
                            <Label>
                              Est. Total
                            </Label>

                            <p className="mt-2 font-semibold">
                              {lineTotal.toLocaleString()}
                            </p>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              removeItem(
                                index
                              )
                            }
                            disabled={
                              items.length ===
                              1
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Notes</Label>

                <Textarea
                  placeholder="Additional notes..."
                  value={notes}
                  onChange={(e) =>
                    setNotes(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="rounded-lg border bg-muted/30 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Estimated Order Total
                  </span>

                  <span className="text-2xl font-bold">
                    {estimatedTotal.toLocaleString()}
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

              <Button
                onClick={
                  savePurchaseOrder
                }
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save Purchase Order"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showReceiveForm &&
        selectedPO && (
          <Card className="border-primary/30">
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <PackageCheck className="h-5 w-5" />
                    Receive Purchase Order
                  </CardTitle>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedPO.poNumber}
                    {" • "}
                    {selectedPO.supplier?.name ||
                      "No supplier"}
                  </p>
                </div>

                <Badge
                  variant={statusVariant(
                    selectedPO.status
                  )}
                >
                  {selectedPO.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {selectedPO.items.map(
                (poItem) => {
                  const ordered =
                    Number(
                      poItem.quantity
                    );

                  const received =
                    Number(
                      poItem.receivedQuantity ||
                        0
                    );

                  const remaining =
                    ordered - received;

                  if (remaining <= 0) {
                    return null;
                  }

                  const receiveItem =
                    receiveItems.find(
                      (item) =>
                        item.itemId ===
                        poItem.id
                    );

                  if (!receiveItem) {
                    return null;
                  }

                  return (
                    <div
                      key={poItem.id}
                      className="rounded-lg border p-4"
                    >
                      <div className="mb-4">
                        <p className="font-semibold">
                          {
                            poItem.rawMaterial
                              .code
                          }{" "}
                          —{" "}
                          {
                            poItem.rawMaterial
                              .name
                          }
                        </p>

                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span>
                            Ordered:{" "}
                            <strong className="text-foreground">
                              {ordered}{" "}
                              {
                                poItem.unit
                              }
                            </strong>
                          </span>

                          <span>
                            Received:{" "}
                            <strong className="text-foreground">
                              {received}{" "}
                              {
                                poItem.unit
                              }
                            </strong>
                          </span>

                          <span>
                            Remaining:{" "}
                            <strong className="text-foreground">
                              {remaining}{" "}
                              {
                                poItem.unit
                              }
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="space-y-2">
                          <Label>
                            Receive Qty
                          </Label>

                          <Input
                            type="number"
                            min="0"
                            max={remaining}
                            step="0.01"
                            placeholder={String(
                              remaining
                            )}
                            value={
                              receiveItem.receivedQuantity
                            }
                            onChange={(e) =>
                              updateReceiveItem(
                                poItem.id,
                                "receivedQuantity",
                                e.target.value
                              )
                            }
                          />

                          <p className="text-xs text-muted-foreground">
                            Max:{" "}
                            {remaining}{" "}
                            {poItem.unit}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>
                            Cost / Unit
                          </Label>

                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              receiveItem.costPerUnit
                            }
                            onChange={(e) =>
                              updateReceiveItem(
                                poItem.id,
                                "costPerUnit",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>
                            Lot Number
                          </Label>

                          <Input
                            placeholder="Optional"
                            value={
                              receiveItem.lotNumber
                            }
                            onChange={(e) =>
                              updateReceiveItem(
                                poItem.id,
                                "lotNumber",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>
                            Expiry Date
                          </Label>

                          <Input
                            type="date"
                            value={
                              receiveItem.expiryDate
                            }
                            onChange={(e) =>
                              updateReceiveItem(
                                poItem.id,
                                "expiryDate",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                }
              )}

              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <p className="font-medium">
                  Receiving workflow
                </p>

                <p className="mt-1 text-muted-foreground">
                  Saving this receipt will create the
                  Purchase, Raw Material Lot, and
                  Inventory transaction automatically.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReceiveForm(false);
                    setSelectedPO(null);
                    setReceiveItems([]);
                  }}
                  disabled={receiving}
                >
                  Cancel
                </Button>

                <Button
                  onClick={
                    receivePurchaseOrder
                  }
                  disabled={receiving}
                >
                  <PackageCheck className="mr-2 h-4 w-4" />

                  {receiving
                    ? "Receiving..."
                    : "Receive Purchase Order"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>
              Purchase Order History
            </CardTitle>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                className="pl-9"
                placeholder="Search PO or supplier..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
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
            <div className="space-y-3">
              {filteredOrders.map(
                (order) => {
                  const total =
                    order.items.reduce(
                      (
                        sum,
                        item
                      ) =>
                        sum +
                        Number(
                          item.quantity
                        ) *
                          Number(
                            item.estimatedCostPerUnit ||
                              0
                          ),
                      0
                    );

                  const hasRemaining =
                    order.items.some(
                      (item) =>
                        Number(
                          item.receivedQuantity ||
                            0
                        ) <
                        Number(
                          item.quantity
                        )
                    );

                  return (
                    <div
                      key={order.id}
                      className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-semibold">
                            {
                              order.poNumber
                            }
                          </span>

                          <Badge
                            variant={statusVariant(
                              order.status
                            )}
                          >
                            {
                              order.status
                            }
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {order.supplier
                            ?.name ||
                            "No supplier"}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatDate(
                              order.orderDate
                            )}
                          </span>

                          <span>
                            {
                              order
                                .items
                                .length
                            }{" "}
                            item
                            {order
                              .items
                              .length !==
                            1
                              ? "s"
                              : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="text-left sm:text-right">
                          <p className="text-sm text-muted-foreground">
                            Estimated Total
                          </p>

                          <p className="text-lg font-bold">
                            {total.toLocaleString()}
                          </p>
                        </div>

                        {hasRemaining &&
                          order.status !==
                            "CANCELLED" && (
                            <Button
                              onClick={() =>
                                openReceiveForm(
                                  order
                                )
                              }
                            >
                              <PackageCheck className="mr-2 h-4 w-4" />
                              Receive
                            </Button>
                          )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}