"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import {
  AlertTriangle,
  Boxes,
  ClipboardCheck,
  Factory,
  FlaskConical,
  Loader2,
  PackageX,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Truck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ActivityItem = {
  id: string;
  type: "PURCHASE" | "PRODUCTION" | "ORDER";
  title: string;
  detail: string;
  amount: number | null;
  date: string;
};

type AlertItem = {
  id: string;
  lotNumber: string;
  expiryDate: string;
  daysUntilExpiry: number | null;
  status: "EXPIRED" | "EXPIRING_SOON";
  rawMaterial: { id: string; code: string; name: string };
  supplier: { id: string; name: string } | null;
};

type StockAlertItem = {
  id: string;
  code: string;
  name: string;
  currentStock: number;
  reorderLevel: number | null;
};

type DashboardData = {
  stats: {
    materials: number;
    suppliers: number;
    lowStock: number;
    outOfStock: number;
    openPurchaseOrders: number;
    batchesInProgress: number;
    batchesCompleted: number;
    batchesReleased: number;
    qcPending: number;
    expiredLots: number;
    expiringSoon: number;
  };
  lowStockItems: StockAlertItem[];
  outOfStockItems: StockAlertItem[];
  expiryAlerts: AlertItem[];
  batchStatusCounts: Record<string, number>;
  totalBatches: number;
  storeOrderStats: {
    total: number;
    open: number;
    new: number;
    delivered: number;
    cancelled: number;
  };
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    status: string;
    total: number;
    itemCount: number;
    createdAt: string;
  }[];
  activity: ActivityItem[];
};

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/dashboard");
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatCurrency = (value: number) => formatMoney(value);

  const statCards = data
    ? [
        {
          title: "Raw Materials",
          value: formatNumber(data.stats.materials),
          description: "Active materials in system",
          icon: FlaskConical,
        },
        {
          title: "Suppliers",
          value: formatNumber(data.stats.suppliers),
          description: "Registered suppliers",
          icon: Truck,
        },
        {
          title: "Stock Alerts",
          value: formatNumber(
            data.stats.lowStock + data.stats.outOfStock
          ),
          description: `${data.stats.lowStock} low · ${data.stats.outOfStock} out`,
          icon: Boxes,
        },
        {
          title: "Open Purchase Orders",
          value: formatNumber(data.stats.openPurchaseOrders),
          description: "Not yet received",
          icon: ShoppingCart,
        },
        {
          title: "Batches In Progress",
          value: formatNumber(data.stats.batchesInProgress),
          description: `${
            data.stats.batchesCompleted
          } completed · ${data.stats.batchesReleased} released`,
          icon: Factory,
        },
        {
          title: "QC Pending",
          value: formatNumber(data.stats.qcPending),
          description: "Awaiting quality control",
          icon: ClipboardCheck,
        },
        {
          title: "Store Orders",
          value: formatNumber(data.storeOrderStats.open),
          description: `${data.storeOrderStats.new} new · ${data.storeOrderStats.delivered} delivered`,
          icon: ShoppingBag,
        },
      ]
    : [];

  const batchStatusLabels: Record<string, string> = {
    DRAFT: "Draft",
    PLANNED: "Planned",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    RELEASED: "Released",
    CANCELLED: "Cancelled",
  };

  const batchStatusClasses: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-600",
    PLANNED: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-purple-100 text-purple-700",
    RELEASED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Overview of your fragrance manufacturing operations.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={loadDashboard}
          disabled={loading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Could not load dashboard data.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {statCards.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.title}
                  className="rounded-xl border bg-card p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>

                      <p className="mt-2 text-3xl font-bold">
                        {stat.value}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {stat.description}
                      </p>
                    </div>

                    <div className="rounded-lg bg-muted p-3">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 grid gap-6">
            {(data.stats.expiredLots > 0 ||
              data.stats.expiringSoon > 0 ||
              data.stats.lowStock > 0 ||
              data.stats.outOfStock > 0) && (
              <div className="grid gap-6 lg:grid-cols-2">
                {(data.expiryAlerts.length > 0 ||
                  data.stats.expiredLots > 0) && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Expiry Alerts</CardTitle>
                      <Link href="/admin/lots" className="text-xs text-muted-foreground underline">
                        View lots
                      </Link>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.expiryAlerts.length === 0 ? (
                        <p className="py-4 text-sm text-muted-foreground">
                          No lots need a retest right now.
                        </p>
                      ) : (
                        data.expiryAlerts.map((alert) => (
                          <div
                            key={alert.id}
                            className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
                              <div>
                                <span className="font-medium">
                                  {alert.rawMaterial.name}
                                </span>
                                <span className="text-muted-foreground">
                                  {" "}
                                  · {alert.lotNumber}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(
                                    alert.expiryDate
                                  ).toLocaleDateString()}{" "}
                                  · {alert.supplier?.name ?? "No supplier"}
                                </div>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                alert.status === "EXPIRED"
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-amber-200 bg-amber-100 text-amber-800"
                              }
                            >
                              {alert.status === "EXPIRED"
                                ? "Needs Retest"
                                : `Expire in ${alert.daysUntilExpiry}d`}
                            </Badge>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                )}

                {data.lowStockItems.length > 0 ||
                data.outOfStockItems.length > 0 ? (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Stock Alerts</CardTitle>
                      <Link
                        href="/admin/recommendations"
                        className="text-xs text-muted-foreground underline"
                      >
                        View recommendations
                      </Link>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[...data.outOfStockItems, ...data.lowStockItems].map(
                        (item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              {item.currentStock <= 0 ? (
                                <PackageX className="h-4 w-4 shrink-0 text-red-600" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                              )}
                              <div>
                                <span className="font-medium">
                                  {item.name}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {item.code}
                                </div>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                item.currentStock <= 0
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                              }
                            >
                              {item.currentStock <= 0
                                ? "Out of stock"
                                : `${formatNumber(item.currentStock)} left · reorder ${formatNumber(item.reorderLevel ?? 0)}`}
                            </Badge>
                          </div>
                        )
                      )}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Recent Activity</CardTitle>
                  <Link
                    href="/admin/purchases"
                    className="text-xs text-muted-foreground underline"
                  >
                    View purchases
                  </Link>
                </CardHeader>

                <CardContent>
                  {data.activity.length === 0 ? (
                    <div className="flex min-h-40 items-center justify-center">
                      <p className="text-sm text-muted-foreground">
                        No activity yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {data.activity.map((item) => (
                        <div
                          key={`${item.type}-${item.id}`}
                          className="flex items-start gap-3"
                        >
                          <div
                            className={`mt-0.5 rounded-md p-1.5 ${
                              item.type === "PURCHASE"
                                ? "bg-blue-50 text-blue-700"
                                : item.type === "ORDER"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-purple-50 text-purple-700"
                            }`}
                          >
                            {item.type === "PURCHASE" ? (
                              <ShoppingCart className="h-3.5 w-3.5" />
                            ) : item.type === "ORDER" ? (
                              <ShoppingBag className="h-3.5 w-3.5" />
                            ) : (
                              <Factory className="h-3.5 w-3.5" />
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">
                                {item.title}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(item.date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.detail}
                            </div>
                          </div>

                          {item.amount !== null && (
                            <span className="text-sm font-semibold">
                              {formatCurrency(item.amount)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Production Overview</CardTitle>
                  <Link
                    href="/admin/production"
                    className="text-xs text-muted-foreground underline"
                  >
                    View production
                  </Link>
                </CardHeader>

                <CardContent>
                  {data.totalBatches === 0 ? (
                    <div className="flex min-h-40 items-center justify-center">
                      <p className="text-sm text-muted-foreground">
                        No batches have been created yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[
                        "DRAFT",
                        "PLANNED",
                        "IN_PROGRESS",
                        "COMPLETED",
                        "RELEASED",
                        "CANCELLED",
                      ].map((status) => {
                        const count =
                          data.batchStatusCounts[status] ?? 0;
                        const pct =
                          data.totalBatches > 0
                            ? (count / data.totalBatches) * 100
                            : 0;

                        return (
                          <div
                            key={status}
                            className="flex items-center gap-3"
                          >
                            <span className="w-24 shrink-0 text-sm text-muted-foreground">
                              {batchStatusLabels[status]}
                            </span>

                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full ${
                                  batchStatusClasses[status] ?? ""
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>

                            <span className="w-8 shrink-0 text-right text-sm font-medium">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Store Orders</CardTitle>
                <Link
                  href="/admin/orders"
                  className="text-xs text-muted-foreground underline"
                >
                  Manage orders
                </Link>
              </CardHeader>

              <CardContent>
                {data.recentOrders.length === 0 ? (
                  <div className="flex min-h-40 items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      No storefront orders yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.recentOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                      >
                        <div>
                          <span className="font-medium">
                            {order.orderNumber}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            {order.customerName} · {order.itemCount} item
                            {order.itemCount === 1 ? "" : "s"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              order.status === "CANCELLED"
                                ? "border-red-200 bg-red-50 text-red-700"
                                : order.status === "DELIVERED"
                                  ? "border-green-200 bg-green-50 text-green-700"
                                  : order.status === "PLACED"
                                    ? "border-blue-200 bg-blue-50 text-blue-700"
                                    : "border-amber-200 bg-amber-50 text-amber-700"
                            }
                          >
                            {order.status.toLowerCase()}
                          </Badge>
                          <span className="font-semibold">
                            {formatCurrency(order.total)}
                          </span>
                          <Link
                            href={`/admin/orders?id=${order.id}`}
                            className="text-xs font-medium text-muted-foreground underline"
                          >
                            Open
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}