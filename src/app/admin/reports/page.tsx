"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ReportData = {
  columns: string[];
  rows: string[][];
  summary?: {
    [key: string]: number | string;
  };
};

const reportTypes = [
  { id: "purchases", label: "Purchases" },
  { id: "vendors", label: "Vendors" },
  { id: "materials", label: "Materials" },
  { id: "inventory", label: "Inventory" },
  { id: "formulas", label: "Formulas" },
  { id: "production", label: "Production" },
  { id: "qc", label: "Quality Control" },
] as const;

const reportDescriptions: Record<string, string> = {
  purchases: "Purchase records with supplier, line items and totals.",
  vendors: "Supplier summary with order counts and spend.",
  materials: "Raw material master with stock and purchase/consumption totals.",
  inventory: "Current stock levels with average cost and valuation.",
  formulas: "Formula list with versions and ingredient counts.",
  production: "Production batches with product, formula and status.",
  qc: "Quality control records with check results and decisions.",
};

type ReportType = (typeof reportTypes)[number]["id"];

export default function ReportsPage() {
  const [activeType, setActiveType] = useState<ReportType>("purchases");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = async (type: ReportType) => {
    try {
      setLoading(true);
      setError("");
      setReport(null);

      const response = await fetch(`/api/reports/${type}`);
      const result = await response.json();

      if (result.success) {
        setReport(result.data);
      } else {
        setError(result.error || "Failed to load report");
      }
    } catch (err) {
      console.error("Failed to load report:", err);
      setError("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadReport(activeType);
    })();
  }, [activeType]);

  const downloadCsv = () => {
    if (!report) return;

    const escape = (value: string) => {
      if (/[",\n]/.test(value)) {
        return `"${value.replaceAll('"', '""')}"`;
      }
      return value;
    };

    const lines = [
      report.columns.map(escape).join(","),
      ...report.rows.map((row) => row.map(escape).join(",")),
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `civilmart-${activeType}-report-${new Date()
      .toISOString()
      .split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatSummaryValue = (value: number | string) => {
    if (typeof value !== "number") return value;
    return value.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          </div>

          <p className="text-muted-foreground">
            View and export purchasing, vendor, material, inventory,
            formula, production and QC reports.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => loadReport(activeType)}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Button onClick={downloadCsv} disabled={!report || loading}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {reportTypes.map((type) => (
          <Button
            key={type.id}
            variant={activeType === type.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveType(type.id)}
          >
            {type.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {reportTypes.find((t) => t.id === activeType)?.label} Report
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {reportDescriptions[activeType]}
              </p>
            </div>

            {report?.summary && Object.keys(report.summary).length > 0 && (
              <div className="flex flex-wrap justify-end gap-2">
                {Object.entries(report.summary).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm"
                  >
                    <span className="capitalize text-muted-foreground">
                      {key.replace(/([A-Z])/g, " $1")}:
                    </span>
                    <span className="font-semibold">
                      {formatSummaryValue(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-muted-foreground">
              {error}
            </div>
          ) : !report ? (
            <div className="py-12 text-center text-muted-foreground">
              No report data.
            </div>
          ) : report.rows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No records for this report yet.
            </div>
          ) : report.rows.length > 200 ? (
            <>
              <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                This report has {report.rows.length.toLocaleString()} rows.
                Showing the first 200. Use{" "}
                <strong>Export CSV</strong> for the full dataset.
              </div>

              <div className="rounded-md border p-4">
                <p className="mb-2 text-sm font-medium">
                  {report.rows.length.toLocaleString()} rows ·{" "}
                  {report.columns.join(", ")}
                </p>
                <p className="text-sm text-muted-foreground">
                  Download the CSV for the complete report including all
                  rows.
                </p>
              </div>
            </>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    {report.columns.map((column) => (
                      <th
                        key={column}
                        className="px-3 py-3 font-medium whitespace-nowrap"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {report.rows.map((row, index) => (
                    <tr
                      key={index}
                      className="border-b last:border-0"
                    >
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-3 py-3 whitespace-nowrap"
                        >
                          {activeType === "production" &&
                          row.length === 9 &&
                          cellIndex === 3 ? (
                            <Badge variant="secondary">{cell}</Badge>
                          ) : (
                            cell
                          )}
                        </td>
                      ))}
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