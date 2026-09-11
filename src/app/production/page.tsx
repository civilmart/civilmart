"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  ChevronDown,
  Factory,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  sizeValue: number | string;
  sizeUnit: string;
  status: string;
};

type MaterialRequirement = {
  rawMaterialId: string;
  rawMaterialName: string;
  formulaQuantity: number;
  formulaUnit: string;
  requiredQuantity: number;
  requiredUnit: string;
  consumedQuantity: number;
  remainingQuantity: number;
  availableQuantity: number;
  availableUnit: string;
  status: "READY" | "PARTIAL" | "INSUFFICIENT" | "CONSUMED";
};

type Product = {
  id: string;
  code: string;
  name: string;
  variants: ProductVariant[];
};

type RawMaterial = {
  id: string;
  code: string;
  name: string;
  unitType: "WEIGHT" | "VOLUME" | "PIECE";
};

type FormulaIngredient = {
  id: string;
  quantity: number | string;
  unitType: string;
  unit: string;
  percentage: number | string | null;
  rawMaterial: RawMaterial;
};

type FormulaVersion = {
  id: string;
  version: number;
  status: string;
  notes: string | null;
  batchSize: number | string;
  batchUnit: string;
  ingredients: FormulaIngredient[];
};

type Formula = {
  id: string;
  code: string;
  name: string;
  status: string;
  productId: string;
  product: Product;
  versions: FormulaVersion[];
};

type Lot = {
  id: string;
  lotNumber: string;
  rawMaterialId: string;
  receivedQty: number | string;
  unit: string;
  rawMaterial: RawMaterial;
};

type MaterialConsumption = {
  id: string;
  quantity: number | string;
  unit: string;
  rawMaterial: RawMaterial;
  lot: Lot | null;
};

type ProductionBatch = {
  id: string;
  batchNumber: string;
  productId: string;
  productVariantId: string | null;
  formulaId: string;
  formulaVersionId: string;
  plannedQuantity: number | string;
  producedQuantity: number | string | null;
  status: string;
  plannedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  product: Product;
  productVariant: ProductVariant | null;
  formula: Formula;
  formulaVersion: FormulaVersion;
  materialConsumptions: MaterialConsumption[];
};


const statusClasses: Record<string, string> = {
  PLANNED: "border-blue-200 bg-blue-50 text-blue-700",
  IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-700",
  COMPLETED: "border-green-200 bg-green-50 text-green-700",
  CANCELLED: "border-red-200 bg-red-50 text-red-700",
};

const unitsByType = {
  WEIGHT: ["G", "KG"],
  VOLUME: ["ML", "L"],
  PIECE: ["PIECE"],
};

export default function ProductionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);

  const [materialRequirements, setMaterialRequirements] = useState<MaterialRequirement[]>([]);

  const [lots, setLots] = useState<Lot[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedBatch, setSelectedBatch] =
    useState<ProductionBatch | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [batchNumber, setBatchNumber] = useState("");
  const [productId, setProductId] = useState("");
  const [productVariantId, setProductVariantId] = useState("");
  const [formulaId, setFormulaId] = useState("");
  const [formulaVersionId, setFormulaVersionId] = useState("");
  const [plannedQuantity, setPlannedQuantity] = useState("");
  const [plannedAt, setPlannedAt] = useState("");
  const [notes, setNotes] = useState("");

  const [producedQuantity, setProducedQuantity] = useState("");

  const selectedProduct = products.find(
    (product) => product.id === productId
  );

  const selectedFormula = formulas.find(
    (formula) =>
      formula.id === formulaId &&
      formula.productId === productId
  );

  const activeVersions = selectedFormula?.versions.filter(
    (version) => version.status === "ACTIVE"
  ) ?? [];

  const selectedVersion = selectedFormula?.versions.find(
    (version) => version.id === formulaVersionId
  );

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        productsRes,
        formulasRes,
        materialsRes,
        lotsRes,
        batchesRes,
      ] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/formulas"),
        fetch("/api/raw-materials"),
        fetch("/api/lots"),
        fetch("/api/production/batches"),
      ]);

      const [
        productsJson,
        formulasJson,
        materialsJson,
        lotsJson,
        batchesJson,
      ] = await Promise.all([
        productsRes.json(),
        formulasRes.json(),
        materialsRes.json(),
        lotsRes.json(),
        batchesRes.json(),
      ]);

      if (!productsRes.ok) {
        throw new Error(
          productsJson.error || "Failed to load products."
        );
      }

      if (!formulasRes.ok) {
        throw new Error(
          formulasJson.error || "Failed to load formulas."
        );
      }

      if (!materialsRes.ok) {
        throw new Error(
          materialsJson.error || "Failed to load raw materials."
        );
      }

      if (!lotsRes.ok) {
        throw new Error(
          lotsJson.error || "Failed to load lots."
        );
      }

      if (!batchesRes.ok) {
        throw new Error(
          batchesJson.error || "Failed to load production batches."
        );
      }

      setProducts(
        Array.isArray(productsJson)
          ? productsJson
          : productsJson.data ?? []
      );

      setFormulas(
        Array.isArray(formulasJson)
          ? formulasJson
          : formulasJson.data ?? []
      );

      setRawMaterials(
        Array.isArray(materialsJson)
          ? materialsJson
          : materialsJson.data ?? []
      );

      setLots(
        Array.isArray(lotsJson)
          ? lotsJson
          : lotsJson.data ?? []
      );

      setBatches(
        Array.isArray(batchesJson)
          ? batchesJson
          : batchesJson.data ?? []
      );
    } catch (error) {
      console.error("Failed to load production data:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to load production data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setProductVariantId("");
    setFormulaId("");
    setFormulaVersionId("");
  }, [productId]);

  useEffect(() => {
    setFormulaVersionId("");

    const activeVersion = formulas
      .find((formula) => formula.id === formulaId)
      ?.versions.find((version) => version.status === "ACTIVE");

    if (activeVersion) {
      setFormulaVersionId(activeVersion.id);
    }
  }, [formulaId, formulas]);

  const resetCreateForm = () => {
    setBatchNumber("");
    setProductId("");
    setProductVariantId("");
    setFormulaId("");
    setFormulaVersionId("");
    setPlannedQuantity("");
    setPlannedAt("");
    setNotes("");
    setShowCreate(false);
  };

  const createBatch = async () => {
    if (!batchNumber.trim()) {
      alert("Batch number is required.");
      return;
    }

    if (!productId) {
      alert("Product is required.");
      return;
    }

    if (!formulaId) {
      alert("Formula is required.");
      return;
    }

    if (!formulaVersionId) {
      alert("An active formula version is required.");
      return;
    }

    if (!plannedQuantity || Number(plannedQuantity) <= 0) {
      alert("Planned quantity must be greater than zero.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/production/batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          batchNumber: batchNumber.trim(),
          productId,
          productVariantId: productVariantId || null,
          formulaId,
          formulaVersionId,
          plannedQuantity: Number(plannedQuantity),
          plannedAt: plannedAt || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create production batch."
        );
      }

      resetCreateForm();
      await loadData();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to create production batch."
      );
    } finally {
      setSaving(false);
    }
  };

  const updateBatchStatus = async (
    batch: ProductionBatch,
    status: string
  ) => {
    try {
      const body: Record<string, unknown> = {
        status,
      };

      if (status === "COMPLETED") {
        if (
          !producedQuantity ||
          Number(producedQuantity) <= 0
        ) {
          alert("Enter the produced quantity first.");
          return;
        }

        body.producedQuantity = Number(producedQuantity);
      }

      const response = await fetch(
        `/api/production/batches/${batch.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.shortages?.length) {
          const shortageText = data.shortages
            .map(
              (item: {
                rawMaterialName: string;
                required: number;
                available: number;
                unit: string;
              }) =>
                `${item.rawMaterialName}: need ${item.required.toFixed(
                  2
                )} ${item.unit}, available ${item.available.toFixed(
                  2
                )} ${item.unit}`
            )
            .join("\n");

          throw new Error(`${data.error}\n\n${shortageText}`);
        }

        throw new Error(
          data.error || "Failed to update production batch."
        );
      }

      setProducedQuantity("");
      await loadData();
      await loadMaterialRequirements(batch.id);

      const refreshed = (
        Array.isArray(data) ? data : null
      );

      if (!refreshed) {
        const latest = await fetch(
          `/api/production/batches`
        ).then((res) => res.json());

        const latestBatch = (
          Array.isArray(latest) ? latest : latest.data ?? []
        ).find((item: ProductionBatch) => item.id === batch.id);

        setSelectedBatch(latestBatch ?? data);
      }

      if (status === "IN_PROGRESS") {
        alert(
          "Production started. Required materials were consumed automatically from available lots."
        );
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update production batch."
      );
    }
  };
  const loadMaterialRequirements = async (batchId: string) => {
    try {
      const response = await fetch(
        `/api/production/batches/${batchId}/requirements`
      );

      if (!response.ok) {
        throw new Error("Failed to load material requirements.");
      }

      const data = await response.json();

      setMaterialRequirements(data.requirements ?? []);
    } catch (error) {
      console.error("Failed to load material requirements:", error);
      setMaterialRequirements([]);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Factory className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">
              Production
            </h1>
          </div>
          <p className="text-muted-foreground">
            Plan batches, consume raw materials, and track production.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Button onClick={() => setShowCreate((value) => !value)}>
            <Plus className="mr-2 h-4 w-4" />
            New Batch
          </Button>
        </div>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Create Production Batch</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Batch Number</Label>
                <Input
                  value={batchNumber}
                  onChange={(event) =>
                    setBatchNumber(event.target.value)
                  }
                  placeholder="e.g. PB-2026-001"
                />
              </div>

              <div className="space-y-2">
                <Label>Product</Label>
                <Select
                  value={productId}
                  onValueChange={setProductId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem
                        key={product.id}
                        value={product.id}
                      >
                        {product.code} — {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Product Variant / SKU</Label>
                <Select
                  value={productVariantId}
                  onValueChange={setProductVariantId}
                  disabled={!selectedProduct}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProduct?.variants.map((variant) => (
                      <SelectItem
                        key={variant.id}
                        value={variant.id}
                      >
                        {variant.sku} — {variant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Formula</Label>
                <Select
                  value={formulaId}
                  onValueChange={setFormulaId}
                  disabled={!productId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select formula" />
                  </SelectTrigger>
                  <SelectContent>
                    {formulas
                      .filter(
                        (formula) =>
                          formula.productId === productId
                      )
                      .map((formula) => (
                        <SelectItem
                          key={formula.id}
                          value={formula.id}
                        >
                          {formula.code} — {formula.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Active Formula Version</Label>
                <Select
                  value={formulaVersionId}
                  onValueChange={setFormulaVersionId}
                  disabled={!selectedFormula}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeVersions.map((version) => (
                      <SelectItem
                        key={version.id}
                        value={version.id}
                      >
                        Version {version.version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Planned Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={plannedQuantity}
                  onChange={(event) =>
                    setPlannedQuantity(event.target.value)
                  }
                  placeholder="e.g. 100"
                />
              </div>

              <div className="space-y-2">
                <Label>Planned Date</Label>
                <Input
                  type="date"
                  value={plannedAt}
                  onChange={(event) =>
                    setPlannedAt(event.target.value)
                  }
                />
              </div>
            </div>

            {selectedVersion && (
              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      Formula Version {selectedVersion.version}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedVersion.ingredients.length} ingredients
                    </p>
                  </div>

                  <Badge variant="outline">
                    {selectedVersion.status}
                  </Badge>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedVersion.ingredients.map((ingredient) => (
                    <div
                      key={ingredient.id}
                      className="rounded-md border bg-background p-3 text-sm"
                    >
                      <div className="font-medium">
                        {ingredient.rawMaterial.name}
                      </div>
                      <div className="text-muted-foreground">
                        {ingredient.quantity} {ingredient.unit}
                        {ingredient.percentage !== null
                          ? ` · ${ingredient.percentage}%`
                          : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Production notes..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={resetCreateForm}
              >
                Cancel
              </Button>

              <Button
                onClick={createBatch}
                disabled={saving}
              >
                {saving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Batch
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Production Batches</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading production batches...
            </div>
          ) : batches.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No production batches yet.
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="rounded-lg border p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">
                          {batch.batchNumber}
                        </span>

                        <Badge
                          variant="outline"
                          className={
                            statusClasses[batch.status] ?? ""
                          }
                        >
                          {batch.status}
                        </Badge>
                      </div>

                      <p className="text-sm">
                        {batch.product.name}
                        {batch.productVariant
                          ? ` · ${batch.productVariant.sku}`
                          : ""}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        Formula: {batch.formula.name} · Version{" "}
                        {batch.formulaVersion.version} · Planned:{" "}
                        {batch.plannedQuantity}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Materials consumed:{" "}
                        {batch.materialConsumptions.length}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      onClick={async () => {
                        setSelectedBatch(batch);
                        await loadMaterialRequirements(batch.id);
                      }}
                    >
                      Manage Batch
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedBatch && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>
                Batch {selectedBatch.batchNumber}
              </CardTitle>

              <Button
                variant="ghost"
                onClick={() => setSelectedBatch(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Product
                </p>
                <p className="font-medium">
                  {selectedBatch.product.name}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Formula
                </p>
                <p className="font-medium">
                  {selectedBatch.formula.name}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Formula Version
                </p>
                <p className="font-medium">
                  Version {selectedBatch.formulaVersion.version}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Planned Quantity
                </p>
                <p className="font-medium">
                  {selectedBatch.plannedQuantity}
                </p>
              </div>
            </div>

            {selectedBatch.status !== "COMPLETED" &&
              selectedBatch.status !== "CANCELLED" && (
                <div className="flex flex-wrap gap-2">
                  {selectedBatch.status === "PLANNED" && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        updateBatchStatus(
                          selectedBatch,
                          "IN_PROGRESS"
                        )
                      }
                    >
                      Start Production
                    </Button>
                  )}

                  {selectedBatch.status === "IN_PROGRESS" && (
                    <>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={producedQuantity}
                          onChange={(event) =>
                            setProducedQuantity(
                              event.target.value
                            )
                          }
                          placeholder="Produced qty"
                          className="w-36"
                        />

                        <Button
                          onClick={() =>
                            updateBatchStatus(
                              selectedBatch,
                              "COMPLETED"
                            )
                          }
                        >
                          <PackageCheck className="mr-2 h-4 w-4" />
                          Complete
                        </Button>
                      </div>
                    </>
                  )}

                  <Button
                    variant="destructive"
                    onClick={() =>
                      updateBatchStatus(
                        selectedBatch,
                        "CANCELLED"
                      )
                    }
                  >
                    Cancel Batch
                  </Button>
                </div>
              )}

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">
                  Material Requirements
                </h3>

                <p className="text-sm text-muted-foreground">
                  Materials are calculated automatically from the selected
                  formula and production quantity, and are consumed
                  automatically from available lots (nearest expiry first)
                  when production starts.
                </p>
              </div>

  {materialRequirements.length === 0 ? (
    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      Loading material requirements...
    </div>
  ) : (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-medium">
              Raw Material
            </th>

            <th className="px-4 py-3 text-right font-medium">
              Formula Qty
            </th>

            <th className="px-4 py-3 text-right font-medium">
              Required
            </th>

            <th className="px-4 py-3 text-right font-medium">
              Available
            </th>

            <th className="px-4 py-3 text-right font-medium">
              Consumed
            </th>

            <th className="px-4 py-3 text-right font-medium">
              Remaining
            </th>

            <th className="px-4 py-3 text-center font-medium">
              Status
            </th>
          </tr>
        </thead>

        <tbody className="divide-y">
          {materialRequirements.map((requirement) => {
            const statusClasses: Record<string, string> = {
              READY:
                "border-green-200 bg-green-50 text-green-700",

              PARTIAL:
                "border-amber-200 bg-amber-50 text-amber-700",

              INSUFFICIENT:
                "border-red-200 bg-red-50 text-red-700",

              CONSUMED:
                "border-blue-200 bg-blue-50 text-blue-700",
            };

            return (
              <tr key={requirement.rawMaterialId}>
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {requirement.rawMaterialName}
                  </div>
                </td>

                <td className="px-4 py-3 text-right">
                  {requirement.formulaQuantity}{" "}
                  {requirement.formulaUnit}
                </td>

                <td className="px-4 py-3 text-right font-medium">
                  {requirement.requiredQuantity.toFixed(4)}{" "}
                  {requirement.requiredUnit}
                </td>

                <td className="px-4 py-3 text-right">
                  {requirement.availableQuantity.toFixed(4)}{" "}
                  {requirement.availableUnit}
                </td>

                <td className="px-4 py-3 text-right">
                  {requirement.consumedQuantity.toFixed(4)}{" "}
                  {requirement.requiredUnit}
                </td>

                <td className="px-4 py-3 text-right font-medium">
                  {requirement.remainingQuantity.toFixed(4)}{" "}
                  {requirement.requiredUnit}
                </td>

                <td className="px-4 py-3 text-center">
                  <Badge
                    variant="outline"
                    className={
                      statusClasses[requirement.status] ?? ""
                    }
                  >
                    {requirement.status}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  )}

  {materialRequirements.length > 0 &&
    materialRequirements.some(
      (item) => item.status === "INSUFFICIENT"
    ) && (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p className="font-medium">
          Insufficient raw-material stock
        </p>

        <p className="mt-1">
          One or more materials do not have enough available
          stock. Production materials cannot be consumed until
          sufficient stock is available.
        </p>
      </div>
    )}

  {materialRequirements.length > 0 &&
    materialRequirements.every(
      (item) => item.status === "CONSUMED"
    ) && (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
        <div className="flex items-center gap-2">
          <BadgeCheck className="h-5 w-5" />

          <div>
            <p className="font-medium">
              All formula materials consumed
            </p>

            <p>
              The batch has received all required raw materials.
            </p>
          </div>
        </div>
      </div>
    )}

  {selectedBatch.materialConsumptions.length > 0 && (
    <div className="rounded-lg border">
      <div className="border-b px-4 py-3 font-medium">
        Consumption by Lot
      </div>

      <div className="divide-y">
        {selectedBatch.materialConsumptions.map(
          (consumption) => (
            <div
              key={consumption.id}
              className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">
                  {consumption.rawMaterial.name}
                </p>

                <p className="text-sm text-muted-foreground">
                  Lot:{" "}
                  {consumption.lot?.lotNumber ??
                    "Unknown"}
                </p>
              </div>

              <Badge variant="outline">
                {consumption.quantity}{" "}
                {consumption.unit}
              </Badge>
            </div>
          )
        )}
      </div>
    </div>
  )}
</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

