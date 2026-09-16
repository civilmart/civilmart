"use client";

import { Fragment, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Boxes, ChevronDown, Loader2, Search } from "lucide-react";

import { fetchJson, ApiError } from "@/lib/fetch-json";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type InventoryRow = {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: string | null;
  categoryId: string | null;
  minimumStock: number | null;
  maximumStock: number | null;
  reorderLevel: number | null;
  currentStock: number;
  totalPurchased: number;
  totalSold: number;
  totalAdjustments: number;
  stockStatus: string;
};

type LedgerEntry = {
  id: string;
  transactionType: string;
  quantity: number;
  isIncoming: boolean;
  unit: string;
  variantId: string | null;
  variant: { id: string; sku: string; name: string } | null;
  referenceType: string | null;
  notes: string | null;
  createdBy: { id: string; name: string | null } | null;
  createdAt: string;
  runningBalance: number;
};

const statusClasses: Record<string, string> = {
  IN_STOCK: "border-green-200 bg-green-50 text-green-700",
  LOW_STOCK: "border-amber-200 bg-amber-50 text-amber-700",
  OUT_OF_STOCK: "border-red-200 bg-red-50 text-red-700",
};

export default function InventoryPage() {
  return (
    <Suspense>
      <InventoryContent />
    </Suspense>
  );
}

function InventoryContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const currentPage = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  const setSearch = (value: string) => {
    router.push(`${pathname}?${createQueryString("search", value)}`);
  };

  const setStatus = (value: string) => {
    router.push(`${pathname}?${createQueryString("status", value)}`);
  };

  const setPage = (value: number) => {
    router.push(`${pathname}?${createQueryString("page", value > 1 ? String(value) : "")}`);
  };

  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const ITEMS_PER_PAGE = 20;
  const [ledgerProductId, setLedgerProductId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[] | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [adjustingProductId, setAdjustingProductId] = useState<string | null>(null);
  const [adjustType, setAdjustType] = useState<"ADJUSTMENT_IN" | "ADJUSTMENT_OUT">("ADJUSTMENT_IN");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [editingReorder, setEditingReorder] = useState<string | null>(null);
  const [reorderValue, setReorderValue] = useState("");

  const loadInventory = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (status) params.set("status", status);

      const data = await fetchJson<{ success: boolean; data?: InventoryRow[] }>(
        `/api/inventory?${params.toString()}`
      );

      if (data.success) {
        setRows(data.data ?? []);
      }
    } catch (error) {
      console.error("Failed to load inventory:", error);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = setTimeout(loadInventory, search.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadInventory, search]);

  const toggleLedger = async (productId: string) => {
    if (ledgerProductId === productId) {
      setLedgerProductId(null);
      setLedger(null);
      return;
    }

    setLedgerProductId(productId);
    setLedger(null);
    setLedgerLoading(true);

    try {
      const response = await fetch(
        `/api/inventory/ledger?productId=${encodeURIComponent(productId)}`
      );
      const data = await response.json();

      if (data.success) {
        setLedger(data.data ?? []);
      }
    } catch (error) {
      console.error("Failed to load ledger:", error);
    } finally {
      setLedgerLoading(false);
    }
  };

  const submitAdjustment = async (productId: string, unit: string) => {
    if (!adjustQty || Number(adjustQty) <= 0 || !adjustReason.trim()) return;

    setAdjustSaving(true);

    try {
      const response = await fetch("/api/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          adjustmentType: adjustType,
          quantity: Number(adjustQty),
          unit,
          reason: adjustReason.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAdjustingProductId(null);
        setAdjustQty("");
        setAdjustReason("");
        setAdjustType("ADJUSTMENT_IN");
        loadInventory();
      } else {
        toast.error(data.error || "Failed to record adjustment.");
      }
    } catch {
      toast.error("Failed to record adjustment.");
    } finally {
      setAdjustSaving(false);
    }
  };

  const saveReorderLevel = async (productId: string) => {
    const value = reorderValue.trim();
    const newValue = value === "" ? null : Number(value);

    if (value !== "" && (Number.isNaN(newValue) || (newValue ?? 0) < 0)) return;

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorderLevel: newValue }),
      });

      if (response.ok) {
        setEditingReorder(null);
        setReorderValue("");
        loadInventory();
      }
    } catch {
      /* silent */
    }
  };

  const filteredRows = useMemo(() => {
    const term = search.toLowerCase().trim();

    return rows.filter((row) => {
      if (!term) return true;

      return (
        row.name.toLowerCase().includes(term) ||
        row.code.toLowerCase().includes(term) ||
        (row.category ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));

  const paginatedRows = useMemo(
    () => filteredRows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredRows, currentPage]
  );

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <div className="flex items-center gap-2">
          <Boxes className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Stock</h1>
        </div>
        <p className="text-muted-foreground">
          Current stock levels for every product, with a full inventory ledger.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Product Stock</CardTitle>

            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search product..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm md:w-44"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="IN_STOCK">In stock</option>
                <option value="LOW_STOCK">Low stock</option>
                <option value="OUT_OF_STOCK">Out of stock</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No products found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2 text-right">In Stock</th>
                    <th className="px-3 py-2 text-right">Purchased</th>
                    <th className="px-3 py-2 text-right">Sold</th>
                    <th className="px-3 py-2 text-right">Adjustments</th>
                    <th className="px-3 py-2 text-right">Reorder At</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedRows.map((row) => (
                    <Fragment key={row.id}>
                      <tr className="border-b hover:bg-muted/40">
                        <td className="px-3 py-3">
                          <div className="font-medium">{row.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.code}
                          </div>
                        </td>

                        <td className="px-3 py-3 text-muted-foreground">
                          {row.category ?? "—"}
                        </td>

                        <td className="px-3 py-3">{row.unit}</td>

                        <td className="px-3 py-3 text-right font-medium">
                          {formatNumber(row.currentStock)}
                        </td>

                        <td className="px-3 py-3 text-right text-muted-foreground">
                          {formatNumber(row.totalPurchased)}
                        </td>

                        <td className="px-3 py-3 text-right text-muted-foreground">
                          {formatNumber(row.totalSold)}
                        </td>

                        <td className="px-3 py-3 text-right text-muted-foreground">
                          {formatNumber(row.totalAdjustments)}
                        </td>

                        <td className="px-3 py-3 text-right text-muted-foreground">
                          {editingReorder === row.id ? (
                            <input
                              type="number"
                              className="w-20 rounded border px-2 py-1 text-right text-sm"
                              value={reorderValue}
                              onChange={(e) => setReorderValue(e.target.value)}
                              onBlur={() => saveReorderLevel(row.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveReorderLevel(row.id);
                                if (e.key === "Escape") {
                                  setEditingReorder(null);
                                  setReorderValue("");
                                }
                              }}
                              autoFocus
                              min={0}
                            />
                          ) : (
                            <button
                              type="button"
                              className="cursor-pointer rounded px-2 py-1 hover:bg-muted"
                              onClick={() => {
                                setEditingReorder(row.id);
                                setReorderValue(
                                  row.reorderLevel !== null ? String(row.reorderLevel) : ""
                                );
                              }}
                            >
                              {row.reorderLevel !== null
                                ? formatNumber(row.reorderLevel)
                                : "—"}
                            </button>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          <Badge
                            variant="outline"
                            className={statusClasses[row.stockStatus] ?? ""}
                          >
                            {row.stockStatus.replace("_", " ").toLowerCase()}
                          </Badge>
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (adjustingProductId === row.id) {
                                  setAdjustingProductId(null);
                                } else {
                                  setAdjustingProductId(row.id);
                                  setAdjustType("ADJUSTMENT_IN");
                                  setAdjustQty("");
                                  setAdjustReason("");
                                }
                              }}
                            >
                              Adjust
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleLedger(row.id)}
                            >
                              <ChevronDown
                                className={`mr-1 h-4 w-4 transition-transform ${
                                  ledgerProductId === row.id ? "rotate-180" : ""
                                }`}
                              />
                              Ledger
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {adjustingProductId === row.id && (
                        <tr key={`${row.id}-adjust`}>
                          <td colSpan={10} className="bg-muted/30 px-4 py-3">
                            <div className="flex flex-wrap items-end gap-3">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                  Type
                                </label>
                                <select
                                  className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                                  value={adjustType}
                                  onChange={(e) =>
                                    setAdjustType(
                                      e.target.value as "ADJUSTMENT_IN" | "ADJUSTMENT_OUT"
                                    )
                                  }
                                >
                                  <option value="ADJUSTMENT_IN">Stock In</option>
                                  <option value="ADJUSTMENT_OUT">Stock Out</option>
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                  Quantity ({row.unit})
                                </label>
                                <input
                                  type="number"
                                  className="flex h-9 w-24 rounded-md border border-input bg-background px-3 text-sm"
                                  value={adjustQty}
                                  onChange={(e) => setAdjustQty(e.target.value)}
                                  min={0}
                                  placeholder="0"
                                />
                              </div>
                              <div className="min-w-[200px]">
                                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                  Reason
                                </label>
                                <input
                                  type="text"
                                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                  value={adjustReason}
                                  onChange={(e) => setAdjustReason(e.target.value)}
                                  placeholder="Why this adjustment?"
                                />
                              </div>
                              <Button
                                size="sm"
                                disabled={
                                  adjustSaving ||
                                  !adjustQty ||
                                  Number(adjustQty) <= 0 ||
                                  !adjustReason.trim()
                                }
                                onClick={() => submitAdjustment(row.id, row.unit)}
                              >
                                {adjustSaving ? "Saving..." : "Save"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {ledgerProductId === row.id && (
                        <tr key={`${row.id}-ledger`}>
                          <td colSpan={10} className="bg-muted/30 px-4 py-3">
                            {ledgerLoading ? (
                              <div className="flex justify-center py-6">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              </div>
                            ) : ledger && ledger.length === 0 ? (
                              <p className="py-6 text-center text-sm text-muted-foreground">
                                No inventory transactions recorded yet.
                              </p>
                            ) : (
                              <div className="max-h-80 overflow-auto">
                                <table className="w-full text-left text-sm">
                                  <thead>
                                    <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                                      <th className="px-3 py-2">Date</th>
                                      <th className="px-3 py-2">Type</th>
                                      <th className="px-3 py-2">Variant</th>
                                      <th className="px-3 py-2 text-right">Qty</th>
                                      <th className="px-3 py-2 text-right">Balance</th>
                                      <th className="px-3 py-2">Reference</th>
                                      <th className="px-3 py-2">Notes</th>
                                      <th className="px-3 py-2">By</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ledger?.map((entry) => (
                                      <tr key={entry.id} className="border-b">
                                        <td className="px-3 py-2 text-muted-foreground">
                                          {new Date(entry.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-3 py-2">
                                          <Badge
                                            variant="outline"
                                            className={
                                              entry.isIncoming
                                                ? "border-green-200 bg-green-50 text-green-700"
                                                : "border-red-200 bg-red-50 text-red-700"
                                            }
                                          >
                                            {entry.transactionType.replace("_", " ").toLowerCase()}
                                          </Badge>
                                        </td>
                                        <td className="px-3 py-2 text-muted-foreground">
                                          {entry.variant
                                            ? `${entry.variant.name} (${entry.variant.sku})`
                                            : "—"}
                                        </td>
                                        <td
                                          className={`px-3 py-2 text-right font-medium ${
                                            entry.isIncoming
                                              ? "text-green-700"
                                              : "text-red-700"
                                          }`}
                                        >
                                          {entry.isIncoming ? "+" : "−"}
                                          {formatNumber(entry.quantity)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium">
                                          {formatNumber(entry.runningBalance)}
                                        </td>
                                        <td className="px-3 py-2 text-muted-foreground">
                                          {entry.referenceType?.replace("_", " ").toLowerCase() ?? "—"}
                                        </td>
                                        <td className="px-3 py-2 text-muted-foreground">
                                          {entry.notes ?? "—"}
                                        </td>
                                        <td className="px-3 py-2 text-muted-foreground">
                                          {entry.createdBy?.name ?? "—"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredRows.length > ITEMS_PER_PAGE && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredRows.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredRows.length)} of {filteredRows.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}