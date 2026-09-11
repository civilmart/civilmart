"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Package,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";

type RawMaterial = {
  id: string;
  code: string;
  name: string;
  unitType: "WEIGHT" | "VOLUME" | "PIECE";
  isActive: boolean;
};

type Supplier = {
  id: string;
  name: string;
  isActive: boolean;
};

type Lot = {
  id: string;
  lotNumber: string;
  receivedAt: string;
  expiryDate: string | null;
  receivedQty: number;
  unitType: string;
  unit: string;
  costPerUnit: number | null;
  totalCost: number | null;
  rawMaterial: RawMaterial;
  supplier: Supplier | null;
};

const initialForm = {
  rawMaterialId: "",
  supplierId: "",
  lotNumber: "",
  receivedAt: new Date().toISOString().split("T")[0],
  expiryDate: "",
  receivedQty: "",
  unitType: "",
  unit: "",
  costPerUnit: "",
  totalCost: "",
  notes: "",
};

export default function LotsPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(initialForm);

  async function loadData() {
    try {
      setLoading(true);

      const [lotsRes, materialsRes, suppliersRes] =
        await Promise.all([
          fetch("/api/lots"),
          fetch("/api/raw-materials"),
          fetch("/api/suppliers"),
        ]);

      const lotsJson = await lotsRes.json();
      const materialsJson = await materialsRes.json();
      const suppliersJson = await suppliersRes.json();

      if (lotsJson.success) {
        setLots(lotsJson.data);
      }

      if (materialsJson.success) {
        setRawMaterials(materialsJson.data);
      }

      if (suppliersJson.success) {
        setSuppliers(suppliersJson.data);
      }
    } catch (error) {
      console.error("Failed to load lot data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateForm(field: string, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleMaterialChange(materialId: string) {
    const material = rawMaterials.find(
      (item) => item.id === materialId
    );

    setForm((previous) => ({
      ...previous,
      rawMaterialId: materialId,
      unitType: material?.unitType || "",
      unit: "",
    }));
  }

  function calculateTotalCost() {
    const quantity = Number(form.receivedQty);
    const cost = Number(form.costPerUnit);

    if (
      Number.isFinite(quantity) &&
      Number.isFinite(cost) &&
      quantity > 0 &&
      cost >= 0
    ) {
      return (quantity * cost).toFixed(2);
    }

    return "";
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);

      const totalCost =
        form.totalCost || calculateTotalCost();

      const response = await fetch("/api/lots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          supplierId: form.supplierId || null,
          expiryDate: form.expiryDate || null,
          costPerUnit: form.costPerUnit
            ? Number(form.costPerUnit)
            : null,
          totalCost: totalCost
            ? Number(totalCost)
            : null,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.error || "Failed to create lot");
        return;
      }

      setForm(initialForm);
      setOpen(false);

      await loadData();
    } catch (error) {
      console.error("Failed to create lot:", error);
      alert("Failed to create lot");
    } finally {
      setSaving(false);
    }
  }

  const filteredLots = lots.filter((lot) => {
    const searchText = search.toLowerCase();

    return (
      lot.lotNumber.toLowerCase().includes(searchText) ||
      lot.rawMaterial.name
        .toLowerCase()
        .includes(searchText) ||
      lot.rawMaterial.code
        .toLowerCase()
        .includes(searchText) ||
      lot.supplier?.name
        .toLowerCase()
        .includes(searchText)
    );
  });

  const units =
    form.unitType === "WEIGHT"
      ? ["G", "KG"]
      : form.unitType === "VOLUME"
        ? ["ML", "L"]
        : form.unitType === "PIECE"
          ? ["PIECE"]
          : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Raw Material Lots
          </h1>
          <p className="text-muted-foreground">
            Manage received raw-material batches and inventory receipts.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Lot
            </Button>
          </DialogTrigger>

          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Raw Material Lot</DialogTitle>
            </DialogHeader>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Raw Material</Label>

                  <Select
                    value={form.rawMaterialId}
                    onValueChange={handleMaterialChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select raw material" />
                    </SelectTrigger>

                    <SelectContent>
                      {rawMaterials
                        .filter((item) => item.isActive)
                        .map((material) => (
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
                  <Label>Supplier</Label>

                  <Select
                    value={form.supplierId}
                    onValueChange={(value) =>
                      updateForm("supplierId", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional supplier" />
                    </SelectTrigger>

                    <SelectContent>
                      {suppliers
                        .filter((supplier) => supplier.isActive)
                        .map((supplier) => (
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
                  <Label htmlFor="lotNumber">
                    Lot Number
                  </Label>

                  <Input
                    id="lotNumber"
                    value={form.lotNumber}
                    onChange={(event) =>
                      updateForm(
                        "lotNumber",
                        event.target.value
                      )
                    }
                    placeholder="LOT-2026-001"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receivedAt">
                    Received Date
                  </Label>

                  <Input
                    id="receivedAt"
                    type="date"
                    value={form.receivedAt}
                    onChange={(event) =>
                      updateForm(
                        "receivedAt",
                        event.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiryDate">
                    Expiry Date
                  </Label>

                  <Input
                    id="expiryDate"
                    type="date"
                    value={form.expiryDate}
                    onChange={(event) =>
                      updateForm(
                        "expiryDate",
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Unit Type</Label>

                  <Input
                    value={
                      form.unitType === "WEIGHT"
                        ? "Weight"
                        : form.unitType === "VOLUME"
                          ? "Volume"
                          : form.unitType === "PIECE"
                            ? "Piece"
                            : ""
                    }
                    readOnly
                    placeholder="Select raw material first"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Quantity</Label>

                  <Input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={form.receivedQty}
                    onChange={(event) =>
                      updateForm(
                        "receivedQty",
                        event.target.value
                      )
                    }
                    placeholder="1000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Unit</Label>

                  <Select
                    value={form.unit}
                    onValueChange={(value) =>
                      updateForm("unit", value)
                    }
                    disabled={units.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>

                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem
                          key={unit}
                          value={unit}
                        >
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cost Per Unit</Label>

                  <Input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={form.costPerUnit}
                    onChange={(event) =>
                      updateForm(
                        "costPerUnit",
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Total Cost</Label>

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.totalCost ||
                      calculateTotalCost()
                    }
                    onChange={(event) =>
                      updateForm(
                        "totalCost",
                        event.target.value
                      )
                    }
                    placeholder="Auto calculated"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>

                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(event) =>
                    updateForm("notes", event.target.value)
                  }
                  placeholder="Optional notes about this lot..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={saving}
                >
                  {saving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {saving ? "Saving..." : "Save Lot"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>
              Lots ({filteredLots.length})
            </CardTitle>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search lots..."
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredLots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="mb-3 h-10 w-10 text-muted-foreground" />

              <h3 className="font-semibold">
                No lots found
              </h3>

              <p className="text-sm text-muted-foreground">
                Add your first raw-material lot to start tracking inventory.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-3 py-3 font-medium">
                      Lot
                    </th>
                    <th className="px-3 py-3 font-medium">
                      Material
                    </th>
                    <th className="px-3 py-3 font-medium">
                      Supplier
                    </th>
                    <th className="px-3 py-3 font-medium">
                      Quantity
                    </th>
                    <th className="px-3 py-3 font-medium">
                      Cost
                    </th>
                    <th className="px-3 py-3 font-medium">
                      Received
                    </th>
                    <th className="px-3 py-3 font-medium">
                      Expiry
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLots.map((lot) => (
                    <tr
                      key={lot.id}
                      className="border-b last:border-0"
                    >
                      <td className="px-3 py-3 font-medium">
                        {lot.lotNumber}
                      </td>

                      <td className="px-3 py-3">
                        <div>
                          {lot.rawMaterial.name}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {lot.rawMaterial.code}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        {lot.supplier?.name || (
                          <span className="text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {Number(lot.receivedQty).toLocaleString()}{" "}
                        <Badge variant="secondary">
                          {lot.unit}
                        </Badge>
                      </td>

                      <td className="px-3 py-3">
                        {lot.totalCost !== null
                          ? Number(
                              lot.totalCost
                            ).toLocaleString()
                          : "—"}
                      </td>

                      <td className="px-3 py-3">
                        {new Date(
                          lot.receivedAt
                        ).toLocaleDateString()}
                      </td>

                      <td className="px-3 py-3">
                        {lot.expiryDate
                          ? new Date(
                              lot.expiryDate
                            ).toLocaleDateString()
                          : "—"}
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