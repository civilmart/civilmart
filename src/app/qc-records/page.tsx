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

// ============================================================
// TYPES
// ============================================================

type CheckResult = "PENDING" | "PASS" | "FAIL";
type Decision = "PENDING" | "APPROVED" | "REJECTED" | "ON_HOLD";
type CheckKey = "maturation" | "stability" | "clarity" | "colour" | "odour";

const CHECKS: { key: CheckKey; label: string }[] = [
  { key: "maturation", label: "Maturation" },
  { key: "stability", label: "Stability" },
  { key: "clarity", label: "Clarity" },
  { key: "colour", label: "Colour" },
  { key: "odour", label: "Odour" },
];

type RawMaterial = { id: string; code: string; name: string };
type Supplier = { id: string; name: string };
type Lot = { id: string; lotNumber: string; supplier: Supplier | null };

type MaterialConsumption = {
  id: string;
  quantity: number | string;
  unit: string;
  rawMaterial: RawMaterial;
  lot: Lot | null;
};

type FormulaIngredient = {
  id: string;
  quantity: number | string;
  unit: string;
  rawMaterial: RawMaterial;
};

type FormulaVersion = {
  id: string;
  version: number;
  ingredients: FormulaIngredient[];
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
  releasedAt: string | null;
  product: { id: string; name: string };
  productVariant: { id: string; sku: string } | null;
  formula: { id: string; name: string };
  formulaVersion: FormulaVersion;
  materialConsumptions: MaterialConsumption[];
};

type QualityControl = {
  id: string;
  productionBatch: ProductionBatch;
  decision: Decision;
  decisionNotes: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  regulatoryReviewResult: CheckResult;
  regulatoryReviewNotes: string | null;
  regulatoryReviewedBy: string | null;
  regulatoryReviewedAt: string | null;
  releasedBy: string | null;
  releasedAt: string | null;
} & {
  [K in `${CheckKey}Result`]: CheckResult;
} & {
  [K in `${CheckKey}Value`]: string | null;
} & {
  [K in `${CheckKey}Notes`]: string | null;
} & {
  [K in `${CheckKey}CheckedBy`]: string | null;
} & {
  [K in `${CheckKey}CheckedAt`]: string | null;
};

// ============================================================
// STYLES
// ============================================================

const resultClasses: Record<CheckResult, string> = {
  PENDING: "border-slate-200 bg-slate-50 text-slate-600",
  PASS: "border-green-200 bg-green-50 text-green-700",
  FAIL: "border-red-200 bg-red-50 text-red-700",
};

const decisionClasses: Record<Decision, string> = {
  PENDING: "border-slate-200 bg-slate-50 text-slate-600",
  APPROVED: "border-green-200 bg-green-50 text-green-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  ON_HOLD: "border-amber-200 bg-amber-50 text-amber-700",
};

const batchStatusClasses: Record<string, string> = {
  COMPLETED: "border-purple-200 bg-purple-50 text-purple-700",
  RELEASED: "border-green-200 bg-green-50 text-green-700",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

// ============================================================
// PAGE
// ============================================================

export default function QCRecordsPage() {
  const [records, setRecords] = useState<QualityControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("ALL");
  const [selected, setSelected] = useState<QualityControl | null>(null);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/qc");
      const data = await response.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load QC records:", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesDecision =
        decisionFilter === "ALL" || record.decision === decisionFilter;

      const term = search.trim().toLowerCase();
      const matchesSearch =
        term.length === 0 ||
        record.productionBatch.batchNumber.toLowerCase().includes(term) ||
        record.productionBatch.product.name.toLowerCase().includes(term) ||
        record.productionBatch.formula.name.toLowerCase().includes(term);

      return matchesDecision && matchesSearch;
    });
  }, [records, search, decisionFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">QC Records</h1>
          </div>
          <p className="text-muted-foreground">
            Searchable, printable QC history and certificates for every
            batch that has gone through quality control. To enter or update
            results, use Quality Control instead.
          </p>
        </div>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>QC Records ({filteredRecords.length})</CardTitle>

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

              <Select value={decisionFilter} onValueChange={setDecisionFilter}>
                <SelectTrigger className="sm:w-44">
                  <SelectValue placeholder="Decision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All decisions</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading QC records...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No QC records match your search.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((record) => (
                <div key={record.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">
                          {record.productionBatch.batchNumber}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            batchStatusClasses[record.productionBatch.status] ??
                            ""
                          }
                        >
                          {record.productionBatch.status}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={decisionClasses[record.decision]}
                        >
                          {record.decision}
                        </Badge>
                      </div>

                      <p className="text-sm">
                        {record.productionBatch.product.name}
                        {record.productionBatch.productVariant
                          ? ` · ${record.productionBatch.productVariant.sku}`
                          : ""}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        Formula: {record.productionBatch.formula.name} ·
                        Completed {formatDate(record.productionBatch.completedAt)}
                      </p>
                    </div>

                    <Button variant="outline" onClick={() => setSelected(record)}>
                      View Record
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 print:hidden">
              <CardTitle>QC Certificate</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button variant="ghost" onClick={() => setSelected(null)}>
                  <X className="mr-2 h-4 w-4" />
                  Close
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold">
                {selected.productionBatch.batchNumber}
              </h2>
              <Badge
                variant="outline"
                className={
                  batchStatusClasses[selected.productionBatch.status] ?? ""
                }
              >
                {selected.productionBatch.status}
              </Badge>
              <Badge
                variant="outline"
                className={decisionClasses[selected.decision]}
              >
                {selected.decision}
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Product</p>
                <p className="font-medium">
                  {selected.productionBatch.product.name}
                  {selected.productionBatch.productVariant
                    ? ` (${selected.productionBatch.productVariant.sku})`
                    : ""}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Formula / Version
                </p>
                <p className="font-medium">
                  {selected.productionBatch.formula.name} · v
                  {selected.productionBatch.formulaVersion.version}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Produced Quantity
                </p>
                <p className="font-medium">
                  {selected.productionBatch.producedQuantity ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="font-medium">
                  {formatDate(selected.productionBatch.completedAt)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Batch QC Checks</h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Check</th>
                      <th className="px-4 py-2 text-left font-medium">Result</th>
                      <th className="px-4 py-2 text-left font-medium">Value</th>
                      <th className="px-4 py-2 text-left font-medium">Notes</th>
                      <th className="px-4 py-2 text-left font-medium">Checked By</th>
                      <th className="px-4 py-2 text-left font-medium">Checked At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {CHECKS.map(({ key, label }) => (
                      <tr key={key}>
                        <td className="px-4 py-2 font-medium">{label}</td>
                        <td className="px-4 py-2">
                          <Badge
                            variant="outline"
                            className={resultClasses[selected[`${key}Result`]]}
                          >
                            {selected[`${key}Result`]}
                          </Badge>
                        </td>
                        <td className="px-4 py-2">
                          {selected[`${key}Value`] ?? "—"}
                        </td>
                        <td className="px-4 py-2">
                          {selected[`${key}Notes`] ?? "—"}
                        </td>
                        <td className="px-4 py-2">
                          {selected[`${key}CheckedBy`] ?? "—"}
                        </td>
                        <td className="px-4 py-2">
                          {formatDate(selected[`${key}CheckedAt`])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1 rounded-lg border p-4">
                <p className="text-sm font-medium">Regulatory Review</p>
                <Badge
                  variant="outline"
                  className={resultClasses[selected.regulatoryReviewResult]}
                >
                  {selected.regulatoryReviewResult}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {selected.regulatoryReviewNotes || "No notes."}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selected.regulatoryReviewedBy
                    ? `By ${selected.regulatoryReviewedBy} · `
                    : ""}
                  {formatDate(selected.regulatoryReviewedAt)}
                </p>
              </div>

              <div className="space-y-1 rounded-lg border p-4">
                <p className="text-sm font-medium">Decision</p>
                <Badge
                  variant="outline"
                  className={decisionClasses[selected.decision]}
                >
                  {selected.decision}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {selected.decisionNotes || "No notes."}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selected.decidedBy ? `By ${selected.decidedBy} · ` : ""}
                  {formatDate(selected.decidedAt)}
                </p>
              </div>
            </div>

            {selected.releasedAt && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                Released {formatDate(selected.releasedAt)}
                {selected.releasedBy ? ` by ${selected.releasedBy}` : ""}.
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-semibold">Full Traceability</h3>

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
                      <th className="px-4 py-3 text-right font-medium">
                        Quantity
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.productionBatch.materialConsumptions.map(
                      (consumption) => (
                        <tr key={consumption.id} className="border-b last:border-0">
                          <td className="px-4 py-3">
                            {consumption.rawMaterial.code} —{" "}
                            {consumption.rawMaterial.name}
                          </td>
                          <td className="px-4 py-3">
                            {consumption.lot?.lotNumber ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            {consumption.lot?.supplier?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {consumption.quantity} {consumption.unit}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
