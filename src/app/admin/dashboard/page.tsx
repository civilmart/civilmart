"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import {
  AlertTriangle,
  Boxes,
  ChevronLeft,
  Loader2,
  Package,
  PackageX,
  Receipt,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Truck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ActivityItem = {
  id: string;
  type: "PURCHASE" | "ORDER";
  title: string;
  detail: string;
  amount: number | null;
  date: string;
};

type StockAlertItem = {
  id: string;
  code: string;
  name: string;
  unit: string;
  currentStock: number;
  reorderLevel: number | null;
};

type DashboardData = {
  stats: {
    products: number;
    suppliers: number;
    lowStock: number;
    outOfStock: number;
    openPurchaseOrders: number;
    stockValue: number;
    outstandingInvoices: number;
  };
  revenue: number;
  storeOrderStats: {
    total: number;
    open: number;
    new: number;
    delivered: number;
    cancelled: number;
  };
  lowStockItems: StockAlertItem[];
  outOfStockItems: StockAlertItem[];
  topSellingItems: {
    productId: string;
    productName: string;
    quantitySold: number;
  }[];
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchDashboard(): Promise<DashboardData | null> {
  const response = await fetch("/api/dashboard");
  const result = await response.json();

  return result.success ? (result.data as DashboardData) : null;
}

useEffect(() => {
  let cancelled = false;

  async function init() {
    setLoading(true);
    const result = await fetchDashboard();

    if (cancelled) return;

    setData(result);
    setLoading(false);
  }

  init();

  return () => {
    cancelled = true;
  };
}, []);

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(value);
  };

  const statCards = data
    ? [
        {
          title: "Products",
          value: formatNumber(data.stats.products),
          description: "Active products in catalogue",
          icon: Package,
        },
        {
          title: "Suppliers",
          value: formatNumber(data.stats.suppliers),
          description: "Registered suppliers",
          icon: Truck,
        },
        {
          title: "Stock Alerts",
          value: formatNumber(data.stats.lowStock + data.stats.outOfStock),
          description: `${data.stats.lowStock} low · ${data.stats.outOfStock} out of stock`,
          icon: Boxes,
        },
        {
          title: "Open Purchase Orders",
          value: formatNumber(data.stats.openPurchaseOrders),
          description: "Not yet received",
          icon: ShoppingCart,
        },
        {
          title: "Revenue",
          value: formatMoney(data.revenue),
          description: "Store order revenue (excl. cancelled)",
          icon: TrendingUp,
        },
        {
          title: "Stock Value",
          value: formatMoney(data.stats.stockValue),
          description: "Valued at current list prices",
          icon: Package,
        },
        {
          title: "Outstanding Invoices",
          value: formatMoney(data.stats.outstandingInvoices),
          description: "Unpaid invoice balance",
          icon: Receipt,
        },
        {
          title: "Store Orders",
          value: formatNumber(data.storeOrderStats.open),
          description: `${data.storeOrderStats.new} new · ${data.storeOrderStats.delivered} delivered`,
          icon: ShoppingBag,
        },
      ]
    : [];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Link
            href="/admin"
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition hover:text-amber-700"
          >
            <ChevronLeft className="h-3 w-3" />
            Back to Manage
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard overview
          </h1>
          <p className="mt-1 text-muted-foreground">
            At-a-glance numbers for your building materials store.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={async () => {
            const result = await fetchDashboard();
            setData(result);
          }}
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
          <Card className="mb-6 border-dashed">
            <CardContent className="py-5">
              <p className="mb-4 text-sm font-semibold">
                New here? Sell your first item in 3 steps:
              </p>

              <div className="grid gap-3 md:grid-cols-3">
                <Link
                  href="/admin/barcodes"
                  className="rounded-md border bg-card p-4 transition-colors hover:bg-muted"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Badge>1</Badge>
                    <span className="text-sm font-medium">Print barcode labels</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Stick a label on every physical item so it can be scanned at
                    the till.
                  </p>
                </Link>

                <Link
                  href="/admin/invoices"
                  className="rounded-md border bg-card p-4 transition-colors hover:bg-muted"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Badge>2</Badge>
                    <span className="text-sm font-medium">Scan at Invoice / POS</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Open the till, scan barcodes to build the bill, then charge.
                  </p>
                </Link>

                <Link
                  href="/admin/products"
                  className="rounded-md border bg-card p-4 transition-colors hover:bg-muted"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Badge>3</Badge>
                    <span className="text-sm font-medium">Manage catalogue</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add products, fix prices or stock, and generate new barcodes.
                  </p>
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

                      <p className="mt-2 text-2xl font-bold">{stat.value}</p>

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
            {(data.stats.lowStock > 0 || data.stats.outOfStock > 0) && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Stock Alerts</CardTitle>
                  <Link
                    href="/admin/inventory"
                    className="text-xs text-muted-foreground underline"
                  >
                    View stock
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
                            <span className="font-medium">{item.name}</span>
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
                            : `${formatNumber(item.currentStock)} ${item.unit.toLowerCase()} left · reorder ${formatNumber(item.reorderLevel ?? 0)}`}
                        </Badge>
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            )}

            {data.topSellingItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Selling Items</CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  {data.topSellingItems.map((item, index) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center text-xs font-semibold text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="font-medium">{item.productName}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatNumber(item.quantitySold)} sold
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
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
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {item.type === "PURCHASE" ? (
                              <ShoppingCart className="h-3.5 w-3.5" />
                            ) : (
                              <ShoppingBag className="h-3.5 w-3.5" />
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
                              {formatMoney(item.amount)}
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
                  <CardTitle>Order Overview</CardTitle>
                  <Link
                    href="/admin/orders"
                    className="text-xs text-muted-foreground underline"
                  >
                    Manage orders
                  </Link>
                </CardHeader>

                <CardContent>
                  {data.storeOrderStats.total === 0 ? (
                    <div className="flex min-h-40 items-center justify-center">
                      <p className="text-sm text-muted-foreground">
                        No storefront orders yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {([
                        ["new", "New"],
                        ["open", "Open"],
                        ["delivered", "Delivered"],
                        ["cancelled", "Cancelled"],
                      ] as const).map(([key, label]) => {
                        const count = data.storeOrderStats[key];
                        const total = data.storeOrderStats.total;
                        const pct = total > 0 ? (count / total) * 100 : 0;

                        return (
                          <div key={key} className="flex items-center gap-3">
                            <span className="w-24 shrink-0 text-sm text-muted-foreground">
                              {label}
                            </span>

                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full ${
                                  key === "delivered"
                                    ? "bg-green-500"
                                    : key === "cancelled"
                                      ? "bg-red-400"
                                      : "bg-amber-500"
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
                            {formatMoney(order.total)}
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