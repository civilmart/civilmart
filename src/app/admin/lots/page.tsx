"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Package,
  Loader2,
  GitBranch,
  AlertTriangle,
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
import { getExpiryStatus, type ExpiryStatus } from "@/lib/expiry";

const expiryStatusClasses: Record<ExpiryStatus, string> = {
  OK: "border-slate-200 bg-slate-50 text-slate-600",
  EXPIRING_SOON: "border-amber-200 bg-amber-50 text-amber-700",
  EXPIRED: "border-red-200 bg-red-50 text-red-700",
  NO_EXPIRY: "border-slate-200 bg-slate-50 text-slate-400",
};

const expiryStatusLabels: Record<ExpiryStatus, string> = {
  OK: "OK",
  EXPIRING_SOON: "Expiring Soon",
  EXPIRED: "Needs Retest",
  NO_EXPIRY: "—",
};

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

type AffectedBatch = {
  id: string;
  batchNumber: string;
  status: string;
  product: { name: string; code: string };
  productVariant: { name: string; sku: string } | null;
  formulaName: string;
  formulaVersion: number;
  quantityConsumed: number;
  unit: string;
  lastConsumedAt: string;
  completedAt: string | null;
  releasedAt: string | null;
  qcDecision: string | null;
};

type LotTraceResult = {
  lot: Lot;
  affectedBatches: AffectedBatch[];
  summary: { totalBatches: number; releasedBatches: number };
};

type ExpirySummary = { expired: number; expiringSoon: number };

const batchStatusClasses: Record<string, string> = {
  DRAFT: "border-slate-200 bg-slate-50 text-slate-600",
  PLANNED: "border-blue-200 bg-blue-50 text-blue-700",
  IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-700",
  COMPLETED: "border-purple-200 bg-purple-50 text-purple-700",
  RELEASED: "border-green-200 bg-green-50 text-green-700",
  CANCELLED: "border-red-200 bg-red-50 text-red-700",
};

const qcDecisionClasses: Record<string, string> = {
  PENDING: "border-slate-200 bg-slate-50 text-slate-600",
  APPROVED: "border-green-200 bg-green-50 text-green-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  ON_HOLD: "border-amber-200 bg-amber-50 text-amber-700",
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

  const [traceOpen, setTraceOpen] = useState(false);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceResult, setTraceResult] =
    useState<LotTraceResult | null>(null);

  const [expirySummary, setExpirySummary] =
    useState<ExpirySummary>({ expired: 0, expiringSoon: 0 });
  const [expiryFilter, setExpiryFilter] =
    useState<"ALL" | "EXPIRED" | "EXPIRING_SOON">("ALL");

  async function openTrace(lotId: string) {
    setTraceOpen(true);
    setTraceLoading(true);
    setTraceResult(null);

    try {
      const response = await fetch(`/api/traceability/lot/${lotId}`);
      const result = await response.json();

      if (result.success) {
        setTraceResult(result.data);
      }
    } catch (error) {
      console.error("Failed to trace lot:", error);
    } finally {
      setTraceLoading(false);
    }
  }

  async function loadData() {
    try {
      setLoading(true);

      const [lotsRes, materialsRes, suppliersRes, expiryRes] =
        await Promise.all([
          fetch("/api/lots"),
          fetch("/api/raw-materials"),
          fetch("/api/suppliers"),
          fetch("/api/lots/expiry-alerts"),
        ]);

      const lotsJson = await lotsRes.json();
      const materialsJson = await materialsRes.json();
      const suppliersJson = await suppliersRes.json();
      const expiryJson = await expiryRes.json();

      if (lotsJson.success) {
        setLots(lotsJson.data);
      }

      if (expiryJson.success) {
        setExpirySummary(expiryJson.data.summary);
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

    const matchesSearch =
      lot.lotNumber.toLowerCase().includes(searchText) ||
      lot.rawMaterial.name
        .toLowerCase()
        .includes(searchText) ||
      lot.rawMaterial.code
        .toLowerCase()
        .includes(searchText) ||
      lot.supplier?.name
        .toLowerCase()
        .includes(searchText);

    if (!matchesSearch) return false;

    if (expiryFilter === "ALL") return true;

    return getExpiryStatus(lot.expiryDate) === expiryFilter;
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

      {(expirySummary.expired > 0 ||
        expirySummary.expiringSoon > 0) && (
        <div className="flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

            <p className="text-sm text-amber-800">
              {expirySummary.expired > 0 && (
                <>
                  <strong>{expirySummary.expired}</strong> lot
                  {expirySummary.expired === 1 ? "" : "s"} past
                  expiry and awaiting retest
                  {expirySummary.expiringSoon > 0 ? ", " : "."}
                </>
              )}
              {expirySummary.expiringSoon > 0 && (
                <>
                  <strong>{expirySummary.expiringSoon}</strong> lot
                  {expirySummary.expiringSoon === 1 ? "" : "s"}{" "}
                  expiring within {30} days.
                </>
              )}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant={
                expiryFilter === "EXPIRED" ? "default" : "outline"
              }
              size="sm"
              onClick={() =>
                setExpiryFilter(
                  expiryFilter === "EXPIRED" ? "ALL" : "EXPIRED"
                )
              }
            >
              Show Expired
            </Button>

            <Button
              variant={
                expiryFilter === "EXPIRING_SOON"
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() =>
                setExpiryFilter(
                  expiryFilter === "EXPIRING_SOON"
                    ? "ALL"
                    : "EXPIRING_SOON"
                )
              }
            >
              Show Expiring Soon
            </Button>
          </div>
        </div>
      )}

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
                    <th className="px-3 py-3 font-medium">
                      Traceability
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
                        {lot.expiryDate ? (
                          <div className="flex flex-col gap-1">
                            <span>
                              {new Date(
                                lot.expiryDate
                              ).toLocaleDateString()}
                            </span>

                            {getExpiryStatus(lot.expiryDate) !==
                              "OK" && (
                              <Badge
                                variant="outline"
                                className={
                                  expiryStatusClasses[
                                    getExpiryStatus(lot.expiryDate)
                                  ]
                                }
                              >
                                {
                                  expiryStatusLabels[
                                    getExpiryStatus(lot.expiryDate)
                                  ]
                                }
                              </Badge>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openTrace(lot.id)}
                        >
                          <GitBranch className="mr-2 h-3.5 w-3.5" />
                          Trace
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={traceOpen} onOpenChange={setTraceOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {traceResult
                ? `Traceability — Lot ${traceResult.lot.lotNumber}`
                : "Traceability"}
            </DialogTitle>
          </DialogHeader>

          {traceLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !traceResult ? (
            <p className="py-6 text-sm text-muted-foreground">
              Could not load traceability data for this lot.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">
                      {traceResult.lot.rawMaterial.name}{" "}
                      <span className="text-muted-foreground">
                        ({traceResult.lot.rawMaterial.code})
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Supplier:{" "}
                      {traceResult.lot.supplier?.name || "—"}
                    </div>
                  </div>

                  <Badge variant="secondary">
                    {traceResult.summary.totalBatches} batch
                    {traceResult.summary.totalBatches === 1
                      ? ""
                      : "es"}{" "}
                    affected
                  </Badge>
                </div>

                {traceResult.summary.releasedBatches > 0 && (
                  <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      {traceResult.summary.releasedBatches} of
                      these batches have already been{" "}
                      <strong>released</strong>. If this lot is
                      recalled, those finished-good batches are
                      directly affected.
                    </span>
                  </div>
                )}
              </div>

              {traceResult.affectedBatches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <GitBranch className="mb-3 h-8 w-8 text-muted-foreground" />
                  <h3 className="font-semibold">
                    No batches have consumed this lot
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    This lot hasn&apos;t been used in production yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="px-3 py-2 font-medium">
                          Batch
                        </th>
                        <th className="px-3 py-2 font-medium">
                          Product
                        </th>
                        <th className="px-3 py-2 font-medium">
                          Consumed
                        </th>
                        <th className="px-3 py-2 font-medium">
                          Status
                        </th>
                        <th className="px-3 py-2 font-medium">
                          QC Decision
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {traceResult.affectedBatches.map((batch) => (
                        <tr
                          key={batch.id}
                          className="border-b last:border-0"
                        >
                          <td className="px-3 py-2 font-medium">
                            {batch.batchNumber}

                            <div className="text-xs font-normal text-muted-foreground">
                              {batch.formulaName} v
                              {batch.formulaVersion}
                            </div>
                          </td>

                          <td className="px-3 py-2">
                            {batch.product.name}

                            {batch.productVariant && (
                              <div className="text-xs text-muted-foreground">
                                {batch.productVariant.name}
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-2">
                            {Number(
                              batch.quantityConsumed
                            ).toLocaleString()}{" "}
                            <Badge variant="secondary">
                              {batch.unit}
                            </Badge>
                          </td>

                          <td className="px-3 py-2">
                            <Badge
                              variant="outline"
                              className={
                                batchStatusClasses[batch.status] ??
                                ""
                              }
                            >
                              {batch.status}
                            </Badge>
                          </td>

                          <td className="px-3 py-2">
                            {batch.qcDecision ? (
                              <Badge
                                variant="outline"
                                className={
                                  qcDecisionClasses[
                                    batch.qcDecision
                                  ] ?? ""
                                }
                              >
                                {batch.qcDecision}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}