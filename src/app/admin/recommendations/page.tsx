"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Sparkles,
  Star,
  TrendingDown,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type RecommendationVendor = {
  supplierId: string;
  name: string;
  avgPrice: number;
  orderCount: number;
  qcPassRate: number | null;
};

type Recommendation = {
  id: string;
  code: string;
  name: string;
  currentStock: number;
  unitType: string;
  minimumStock: number | null;
  reorderLevel: number | null;
  consumedLast90Days: number;
  avgDailyConsumption: number;
  daysOfStockLeft: number | null;
  status: "OUT_OF_STOCK" | "LOW_STOCK";
  recommendedOrderQty: number;
  priority: "HIGH" | "MEDIUM";
  vendorSuggestions: RecommendationVendor[];
};

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/inventory/recommendations");
      const result = await response.json();

      if (result.success) {
        setRecommendations(result.data);
      }
    } catch (error) {
      console.error("Failed to load recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getUnitLabel = (unitType: string) => {
    if (unitType === "WEIGHT") return "G / KG";
    if (unitType === "VOLUME") return "ML / L";
    return "PIECE";
  };

  const getPriorityBadge = (priority: Recommendation["priority"]) => {
    if (priority === "HIGH") {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="mr-1 h-3.5 w-3.5" />
          High Priority
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        <Clock className="mr-1 h-3.5 w-3.5" />
        Medium Priority
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">
              Reorder Recommendations
            </h1>
          </div>

          <p className="text-muted-foreground">
            Materials at or below reorder level, with suggested quantities
            and vendor pricing intelligence.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={loadRecommendations}
          disabled={loading}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {!loading && recommendations.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Materials to Reorder
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {recommendations.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                High Priority
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  recommendations.filter((r) => r.priority === "HIGH")
                    .length
                }
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Out of Stock
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  recommendations.filter(
                    (r) => r.status === "OUT_OF_STOCK"
                  ).length
                }
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Recommended Orders ({recommendations.length})
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : recommendations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="font-semibold">
                No materials need reordering
              </h3>
              <p className="text-sm text-muted-foreground">
                All active materials are above their reorder levels.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-md border p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{rec.name}</span>
                        <Badge variant="secondary">{rec.code}</Badge>
                        {getPriorityBadge(rec.priority)}
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        {rec.status === "OUT_OF_STOCK"
                          ? "Out of stock"
                          : "Low stock"}{" "}
                        · Current:{" "}
                        <span
                          className={
                            rec.currentStock <= 0
                              ? "font-medium text-red-600"
                              : "font-medium"
                          }
                        >
                          {formatNumber(rec.currentStock)}{" "}
                          {getUnitLabel(rec.unitType)}
                        </span>{" "}
                        · Reorder level:{" "}
                        {rec.reorderLevel !== null
                          ? `${formatNumber(rec.reorderLevel)} ${getUnitLabel(rec.unitType)}`
                          : "—"}
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        Consumption:{" "}
                        {formatNumber(rec.consumedLast90Days)}{" "}
                        {getUnitLabel(rec.unitType)} in last 90 days
                        {rec.daysOfStockLeft !== null && (
                          <>
                            {" "}
                            · ~
                            {formatNumber(rec.daysOfStockLeft)} days of
                            stock left
                          </>
                        )}
                      </div>
                    </div>

                    <div className="rounded-md border bg-muted/50 p-3">
                      <div className="text-xs text-muted-foreground">
                        Recommended Order
                      </div>
                      <div className="text-lg font-bold">
                        {formatNumber(rec.recommendedOrderQty)}{" "}
                        {getUnitLabel(rec.unitType)}
                      </div>
                    </div>
                  </div>

                  {rec.vendorSuggestions.length > 0 && (
                    <div className="mt-3">
                      <div className="mb-1 text-xs font-medium text-muted-foreground">
                        Vendor Pricing
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {rec.vendorSuggestions.map((vendor) => (
                          <div
                            key={vendor.supplierId}
                            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                          >
                            <span className="font-medium">
                              {vendor.name}
                            </span>
                            <Badge variant="secondary">
                              {formatCurrency(vendor.avgPrice)} avg
                            </Badge>
                            {vendor.qcPassRate !== null && (
                              <Badge
                                variant="outline"
                                className={
                                  vendor.qcPassRate >= 90
                                    ? "border-green-200 bg-green-50 text-green-700"
                                    : "border-amber-200 bg-amber-50 text-amber-700"
                                }
                              >
                                <Star className="mr-1 h-3 w-3" />
                                {formatNumber(vendor.qcPassRate)}% QC
                                pass
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>

                      {rec.vendorSuggestions.length > 1 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          <TrendingDown className="mr-1 inline h-3 w-3" />
                          Best value:{" "}
                          {rec.vendorSuggestions[0].name} at{" "}
                          {formatCurrency(
                            rec.vendorSuggestions[0].avgPrice
                          )}{" "}
                          per unit.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}