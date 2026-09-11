"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Loader2,
  Printer,
  Search,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProductVariant = {
  id: string;
  sku: string;
  name: string;
};

type Product = {
  id: string;
  code: string;
  name: string;
};

type Formula = {
  id: string;
  code: string;
  name: string;
};

type FormulaVersion = {
  id: string;
  version: number;
  batchSize: number | string;
  batchUnit: string;
};

type RawMaterial = {
  id: string;
  code: string;
  name: string;
};

type Lot = {
  id: string;
  lotNumber: string;
  expiryDate: string | null;
  supplier?: { name: string } | null;
};

type MaterialConsumption = {
  id: string;
  quantity: number | string;
  unit: string;
  notes: string | null;
  createdAt: string;
  rawMaterial: RawMaterial;
  lot: Lot | null;
};

type ProductionBatch = {
  id: string;
  batchNumber: string;
  plannedQuantity: number | string;
  producedQuantity: number | string | null;
  status: string;
  plannedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  product: Product;
  productVariant: ProductVariant | null;
  formula: Formula;
  formulaVersion: FormulaVersion;
  materialConsumptions: MaterialConsumption[];
};

const statusClasses: Record<string, string> = {
  PLANNED: "border-blue-200 bg-blue-50 text-blue-700",
  IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-700",
  COMPLETED: "border-purple-200 bg-purple-50 text-purple-700",
  RELEASED: "border-green-200 bg-green-50 text-green-700",
  CANCELLED: "border-red-200 bg-red-50 text-red-700",
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString();
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedBatch, setSelectedBatch] =
    useState<ProductionBatch | null>(null);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/production/batches");
      const data = await response.json();

      setBatches(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load batch records:", error);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const matchesStatus =
        statusFilter === "ALL" || batch.status === statusFilter;

      const term = search.trim().toLowerCase();
      const matchesSearch =
        term.length === 0 ||
        batch.batchNumber.toLowerCase().includes(term) ||
        batch.product.name.toLowerCase().includes(term) ||
        batch.formula.name.toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [batches, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">
              Batch Records
            </h1>
          </div>
          <p className="text-muted-foreground">
            Full traceability record for every production batch: formula
            used, planned vs. actual quantity, and every raw-material lot
            consumed.
          </p>
        </div>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>
              Batches ({filteredBatches.length})
            </CardTitle>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  placeholder="Search batch, product, formula..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="sm:w-44">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="IN_PROGRESS">
                    In Progress
                  </SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="RELEASED">Released</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading batch records...
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No batch records match your search.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBatches.map((batch) => (
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
                        {batch.plannedQuantity}{" "}
                        {batch.formulaVersion.batchUnit}
                        {batch.producedQuantity !== null
                          ? ` · Produced: ${batch.producedQuantity} ${batch.formulaVersion.batchUnit}`
                          : ""}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setSelectedBatch(batch)}
                    >
                      View Record
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
            <div className="flex items-center justify-between gap-4 print:hidden">
              <CardTitle>
                Batch Manufacturing Record
              </CardTitle>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setSelectedBatch(null)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Close
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold">
                {selectedBatch.batchNumber}
              </h2>

              <Badge
                variant="outline"
                className={
                  statusClasses[selectedBatch.status] ?? ""
                }
              >
                {selectedBatch.status}
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Product
                </p>
                <p className="font-medium">
                  {selectedBatch.product.name}
                  {selectedBatch.productVariant
                    ? ` (${selectedBatch.productVariant.sku})`
                    : ""}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Formula / Version
                </p>
                <p className="font-medium">
                  {selectedBatch.formula.name} · v
                  {selectedBatch.formulaVersion.version}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Planned Quantity
                </p>
                <p className="font-medium">
                  {selectedBatch.plannedQuantity}{" "}
                  {selectedBatch.formulaVersion.batchUnit}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Actual Produced Quantity
                </p>
                <p className="font-medium">
                  {selectedBatch.producedQuantity !== null
                    ? `${selectedBatch.producedQuantity} ${selectedBatch.formulaVersion.batchUnit}`
                    : "Not recorded yet"}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Planned At
                </p>
                <p className="font-medium">
                  {formatDate(selectedBatch.plannedAt)}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Started At
                </p>
                <p className="font-medium">
                  {formatDate(selectedBatch.startedAt)}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Completed At
                </p>
                <p className="font-medium">
                  {formatDate(selectedBatch.completedAt)}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Notes
                </p>
                <p className="font-medium">
                  {selectedBatch.notes || "—"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">
                Materials Consumed (Traceability)
              </h3>

              {selectedBatch.materialConsumptions.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No materials have been consumed for this batch yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">
                          Raw Material
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Lot Number
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Supplier
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Lot Expiry
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Consumed At
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedBatch.materialConsumptions.map(
                        (consumption) => (
                          <tr
                            key={consumption.id}
                            className="border-b last:border-0"
                          >
                            <td className="px-4 py-3">
                              {consumption.rawMaterial.name}
                            </td>
                            <td className="px-4 py-3">
                              {consumption.lot?.lotNumber ?? "—"}
                            </td>
                            <td className="px-4 py-3">
                              {consumption.lot?.supplier?.name ?? "—"}
                            </td>
                            <td className="px-4 py-3">
                              {consumption.lot?.expiryDate
                                ? new Date(
                                    consumption.lot.expiryDate
                                  ).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {consumption.quantity}{" "}
                              {consumption.unit}
                            </td>
                            <td className="px-4 py-3">
                              {formatDate(consumption.createdAt)}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
