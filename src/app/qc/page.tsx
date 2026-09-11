"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  ChevronDown,
  ClipboardCheck,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

// ============================================================
// TYPES
// ============================================================

type CheckResult = "PENDING" | "PASS" | "FAIL";
type Decision = "PENDING" | "APPROVED" | "REJECTED" | "ON_HOLD";

type CheckKey =
  | "maturation"
  | "stability"
  | "clarity"
  | "colour"
  | "odour";

const CHECKS: { key: CheckKey; label: string; placeholder: string }[] = [
  { key: "maturation", label: "Maturation", placeholder: "e.g. rested 21 days" },
  { key: "stability", label: "Stability", placeholder: "e.g. freeze/heat cycle result" },
  { key: "clarity", label: "Clarity", placeholder: "e.g. clear, no sediment" },
  { key: "colour", label: "Colour", placeholder: "e.g. pale amber" },
  { key: "odour", label: "Odour", placeholder: "e.g. matches standard" },
];

type RawMaterial = {
  id: string;
  code: string;
  name: string;
};

type Supplier = {
  id: string;
  name: string;
};

type Lot = {
  id: string;
  lotNumber: string;
  supplier: Supplier | null;
};

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
  batchSize: number | string;
  batchUnit: string;
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
  product: { id: string; code: string; name: string };
  productVariant: { id: string; sku: string; name: string } | null;
  formula: { id: string; code: string; name: string };
  formulaVersion: FormulaVersion;
  materialConsumptions: MaterialConsumption[];
};

type QualityControl = {
  id: string;
  productionBatchId: string;
  productionBatch: ProductionBatch;

  maturationResult: CheckResult;
  maturationValue: string | null;
  maturationNotes: string | null;
  maturationCheckedBy: string | null;
  maturationCheckedAt: string | null;

  stabilityResult: CheckResult;
  stabilityValue: string | null;
  stabilityNotes: string | null;
  stabilityCheckedBy: string | null;
  stabilityCheckedAt: string | null;

  clarityResult: CheckResult;
  clarityValue: string | null;
  clarityNotes: string | null;
  clarityCheckedBy: string | null;
  clarityCheckedAt: string | null;

  colourResult: CheckResult;
  colourValue: string | null;
  colourNotes: string | null;
  colourCheckedBy: string | null;
  colourCheckedAt: string | null;

  odourResult: CheckResult;
  odourValue: string | null;
  odourNotes: string | null;
  odourCheckedBy: string | null;
  odourCheckedAt: string | null;

  regulatoryReviewResult: CheckResult;
  regulatoryReviewNotes: string | null;
  regulatoryReviewedBy: string | null;
  regulatoryReviewedAt: string | null;

  decision: Decision;
  decisionNotes: string | null;
  decidedBy: string | null;
  decidedAt: string | null;

  releasedBy: string | null;
  releasedAt: string | null;

  readyForApproval: boolean;
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
  COMPLETED: "border-blue-200 bg-blue-50 text-blue-700",
  RELEASED: "border-green-200 bg-green-50 text-green-700",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

// ============================================================
// PAGE
// ============================================================

export default function QCPage() {
  const [records, setRecords] = useState<QualityControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QualityControl | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Draft state for the currently open detail panel, keyed by field name.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const loadList = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/qc");
      const data = await response.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load QC records:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const openRecord = async (id: string) => {
    try {
      const response = await fetch(`/api/qc/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load QC record.");
      }

      setSelected(data);
      seedDrafts(data);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to load QC record."
      );
    }
  };

  const seedDrafts = (record: QualityControl) => {
    const next: Record<string, string> = {};

    for (const { key } of CHECKS) {
      next[`${key}Value`] = record[`${key}Value` as keyof QualityControl] as string ?? "";
      next[`${key}Notes`] = record[`${key}Notes` as keyof QualityControl] as string ?? "";
      next[`${key}CheckedBy`] = record[`${key}CheckedBy` as keyof QualityControl] as string ?? "";
    }

    next.regulatoryReviewNotes = record.regulatoryReviewNotes ?? "";
    next.regulatoryReviewedBy = record.regulatoryReviewedBy ?? "";
    next.decisionNotes = record.decisionNotes ?? "";
    next.decidedBy = record.decidedBy ?? "";
    next.releasedBy = "";

    setDrafts(next);
  };

  const refreshSelected = async (id: string) => {
    const response = await fetch(`/api/qc/${id}`);
    const data = await response.json();
    if (response.ok) {
      setSelected(data);
      seedDrafts(data);
    }
    await loadList();
  };

  const saveCheck = async (key: CheckKey, result: CheckResult) => {
    if (!selected) return;

    setSavingKey(key);
    try {
      const response = await fetch(`/api/qc/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          check: key,
          result,
          value: drafts[`${key}Value`] ?? "",
          notes: drafts[`${key}Notes`] ?? "",
          checkedBy: drafts[`${key}CheckedBy`] ?? "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save check.");
      }

      await refreshSelected(selected.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save check.");
    } finally {
      setSavingKey(null);
    }
  };

  const saveRegulatoryReview = async (result: CheckResult) => {
    if (!selected) return;

    setSavingKey("regulatory");
    try {
      const response = await fetch(`/api/qc/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regulatoryReviewResult: result,
          regulatoryReviewNotes: drafts.regulatoryReviewNotes ?? "",
          regulatoryReviewedBy: drafts.regulatoryReviewedBy ?? "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save regulatory review.");
      }

      await refreshSelected(selected.id);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save regulatory review."
      );
    } finally {
      setSavingKey(null);
    }
  };

  const saveDecision = async (decision: Decision) => {
    if (!selected) return;

    setSavingKey("decision");
    try {
      const response = await fetch(`/api/qc/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          decisionNotes: drafts.decisionNotes ?? "",
          decidedBy: drafts.decidedBy ?? "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save decision.");
      }

      await refreshSelected(selected.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save decision.");
    } finally {
      setSavingKey(null);
    }
  };

  const releaseBatch = async () => {
    if (!selected) return;

    if (!confirm("Release this batch? This cannot be undone.")) return;

    setSavingKey("release");
    try {
      const response = await fetch(`/api/qc/${selected.id}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releasedBy: drafts.releasedBy ?? "" }),
      });

      const data = await response.json();

      if (!response.ok) {
        const outstanding = Array.isArray(data.outstanding)
          ? "\n\n" + data.outstanding.join("\n")
          : "";
        throw new Error((data.error || "Failed to release batch.") + outstanding);
      }

      await refreshSelected(selected.id);
      alert("Batch released.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to release batch.");
    } finally {
      setSavingKey(null);
    }
  };

  const locked = Boolean(selected?.releasedAt);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">
              Quality Control
            </h1>
          </div>
          <p className="text-muted-foreground">
            QC records open automatically when a batch is completed. Every
            check and the regulatory review must pass before a batch can be
            approved and released.
          </p>
        </div>

        <Button variant="outline" onClick={loadList} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Batches Awaiting / Under QC</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading QC records...
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No batches have reached QC yet. A QC record is created
              automatically once a production batch is marked Completed.
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
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
                        Version {record.productionBatch.formulaVersion.version}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => openRecord(record.id)}
                    >
                      Review QC
                      <ChevronDown className="ml-2 h-4 w-4" />
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
            <div className="flex items-center justify-between gap-4">
              <CardTitle>
                QC — Batch {selected.productionBatch.batchNumber}
              </CardTitle>

              <Button variant="ghost" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {locked && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                <Lock className="h-5 w-5" />
                <div>
                  <p className="font-medium">Batch released</p>
                  <p>
                    Released {formatDate(selected.releasedAt)}
                    {selected.releasedBy ? ` by ${selected.releasedBy}` : ""}.
                    This QC record is now locked.
                  </p>
                </div>
              </div>
            )}

            {/* Batch summary */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Product</p>
                <p className="font-medium">
                  {selected.productionBatch.product.name}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Formula</p>
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

            {/* Five physical checks */}
            <div className="space-y-4">
              <h3 className="font-semibold">Batch QC Checks</h3>

              <div className="grid gap-4 lg:grid-cols-2">
                {CHECKS.map(({ key, label, placeholder }) => {
                  const result = selected[`${key}Result` as keyof QualityControl] as CheckResult;
                  const checkedAt = selected[`${key}CheckedAt` as keyof QualityControl] as string | null;

                  return (
                    <div key={key} className="space-y-3 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{label}</p>
                        <Badge
                          variant="outline"
                          className={resultClasses[result]}
                        >
                          {result}
                        </Badge>
                      </div>

                      <Input
                        placeholder={placeholder}
                        value={drafts[`${key}Value`] ?? ""}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [`${key}Value`]: event.target.value,
                          }))
                        }
                        disabled={locked}
                      />

                      <Textarea
                        placeholder="Notes"
                        value={drafts[`${key}Notes`] ?? ""}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [`${key}Notes`]: event.target.value,
                          }))
                        }
                        disabled={locked}
                      />

                      <Input
                        placeholder="Checked by"
                        value={drafts[`${key}CheckedBy`] ?? ""}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [`${key}CheckedBy`]: event.target.value,
                          }))
                        }
                        disabled={locked}
                      />

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          {checkedAt
                            ? `Checked ${formatDate(checkedAt)}`
                            : "Not checked yet"}
                        </p>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={locked || savingKey === key}
                            onClick={() => saveCheck(key, "FAIL")}
                          >
                            Fail
                          </Button>
                          <Button
                            size="sm"
                            disabled={locked || savingKey === key}
                            onClick={() => saveCheck(key, "PASS")}
                          >
                            {savingKey === key && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Pass
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Regulatory review */}
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Regulatory Review</h3>
                <Badge
                  variant="outline"
                  className={resultClasses[selected.regulatoryReviewResult]}
                >
                  {selected.regulatoryReviewResult}
                </Badge>
              </div>

              <Textarea
                placeholder="Regulatory review notes"
                value={drafts.regulatoryReviewNotes ?? ""}
                onChange={(event) =>
                  setDrafts((prev) => ({
                    ...prev,
                    regulatoryReviewNotes: event.target.value,
                  }))
                }
                disabled={locked}
              />

              <Input
                placeholder="Reviewed by"
                value={drafts.regulatoryReviewedBy ?? ""}
                onChange={(event) =>
                  setDrafts((prev) => ({
                    ...prev,
                    regulatoryReviewedBy: event.target.value,
                  }))
                }
                disabled={locked}
              />

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {selected.regulatoryReviewedAt
                    ? `Reviewed ${formatDate(selected.regulatoryReviewedAt)}`
                    : "Not reviewed yet"}
                </p>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={locked || savingKey === "regulatory"}
                    onClick={() => saveRegulatoryReview("FAIL")}
                  >
                    Fail
                  </Button>
                  <Button
                    size="sm"
                    disabled={locked || savingKey === "regulatory"}
                    onClick={() => saveRegulatoryReview("PASS")}
                  >
                    Pass
                  </Button>
                </div>
              </div>
            </div>

            {/* Overall decision */}
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">QC Decision</h3>
                <Badge
                  variant="outline"
                  className={decisionClasses[selected.decision]}
                >
                  {selected.decision}
                </Badge>
              </div>

              {!selected.readyForApproval && selected.decision !== "APPROVED" && (
                <p className="text-sm text-amber-700">
                  Every check and the regulatory review must pass before this
                  batch can be approved.
                </p>
              )}

              <Textarea
                placeholder="Decision notes"
                value={drafts.decisionNotes ?? ""}
                onChange={(event) =>
                  setDrafts((prev) => ({
                    ...prev,
                    decisionNotes: event.target.value,
                  }))
                }
                disabled={locked}
              />

              <Input
                placeholder="Decided by"
                value={drafts.decidedBy ?? ""}
                onChange={(event) =>
                  setDrafts((prev) => ({
                    ...prev,
                    decidedBy: event.target.value,
                  }))
                }
                disabled={locked}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={locked || savingKey === "decision"}
                  onClick={() => saveDecision("ON_HOLD")}
                >
                  Hold
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={locked || savingKey === "decision"}
                  onClick={() => saveDecision("REJECTED")}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  disabled={
                    locked ||
                    savingKey === "decision" ||
                    !selected.readyForApproval
                  }
                  onClick={() => saveDecision("APPROVED")}
                >
                  <BadgeCheck className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </div>
            </div>

            {/* Final release */}
            {selected.decision === "APPROVED" && !locked && (
              <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-green-700" />
                  <h3 className="font-semibold text-green-700">
                    Ready for Final Release
                  </h3>
                </div>

                <Input
                  placeholder="Released by"
                  value={drafts.releasedBy ?? ""}
                  onChange={(event) =>
                    setDrafts((prev) => ({
                      ...prev,
                      releasedBy: event.target.value,
                    }))
                  }
                />

                <Button
                  disabled={savingKey === "release"}
                  onClick={releaseBatch}
                >
                  {savingKey === "release" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Release Batch
                </Button>
              </div>
            )}

            {/* Full traceability */}
            <div className="space-y-4">
              <h3 className="font-semibold">Full Traceability</h3>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Planned</p>
                  <p>{formatDate(selected.productionBatch.plannedAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Started</p>
                  <p>{formatDate(selected.productionBatch.startedAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Completed</p>
                  <p>{formatDate(selected.productionBatch.completedAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Released</p>
                  <p>{formatDate(selected.productionBatch.releasedAt)}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">
                  Formula Version {selected.productionBatch.formulaVersion.version}{" "}
                  Ingredients
                </p>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">
                          Raw Material
                        </th>
                        <th className="px-4 py-2 text-right font-medium">
                          Formula Qty
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selected.productionBatch.formulaVersion.ingredients.map(
                        (ingredient) => (
                          <tr key={ingredient.id}>
                            <td className="px-4 py-2">
                              {ingredient.rawMaterial.code} —{" "}
                              {ingredient.rawMaterial.name}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {ingredient.quantity} {ingredient.unit}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">
                  Materials Consumed (lot-level)
                </p>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">
                          Raw Material
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Lot
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Supplier
                        </th>
                        <th className="px-4 py-2 text-right font-medium">
                          Quantity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selected.productionBatch.materialConsumptions.map(
                        (consumption) => (
                          <tr key={consumption.id}>
                            <td className="px-4 py-2">
                              {consumption.rawMaterial.code} —{" "}
                              {consumption.rawMaterial.name}
                            </td>
                            <td className="px-4 py-2">
                              {consumption.lot?.lotNumber ?? "—"}
                            </td>
                            <td className="px-4 py-2">
                              {consumption.lot?.supplier?.name ?? "—"}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {consumption.quantity} {consumption.unit}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
