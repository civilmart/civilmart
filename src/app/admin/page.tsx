"use client";

import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  LayoutDashboard,
  Megaphone,
  Package,
  Receipt,
  TrendingUp,
  Truck,
} from "lucide-react";
import { Card } from "@/components/ui/card";

type Module = {
  key: string;
  title: string;
  description: string;
  icon: typeof Package;
  accent: string;
  iconBg: string;
  openHref: string;
  openLabel: string;
  shortcuts: Array<{ label: string; href: string }>;
};

const MODULES: Module[] = [
  {
    key: "sales",
    title: "Sales & POS",
    description: "Sell at the counter, scan barcodes, record payments and manage invoices.",
    icon: Receipt,
    accent: "text-amber-700",
    iconBg: "bg-amber-50 text-amber-700",
    openHref: "/admin/invoices",
    openLabel: "Invoice / POS till",
    shortcuts: [
      { label: "Invoice / POS", href: "/admin/invoices" },
      { label: "Barcode labels", href: "/admin/barcodes" },
      { label: "Customers", href: "/admin/customers" },
    ],
  },
  {
    key: "inventory",
    title: "Inventory & Stock",
    description: "Check stock levels, fix counts, spot low-stock and out-of-stock alerts.",
    icon: Package,
    accent: "text-sky-700",
    iconBg: "bg-sky-50 text-sky-700",
    openHref: "/admin/inventory",
    openLabel: "Open stock inventory",
    shortcuts: [
      { label: "Stock inventory", href: "/admin/inventory" },
      { label: "Adjustments", href: "/admin/adjustments" },
    ],
  },
  {
    key: "purchasing",
    title: "Purchasing",
    description: "Record supplier purchases and track purchase orders end to end.",
    icon: Truck,
    accent: "text-emerald-700",
    iconBg: "bg-emerald-50 text-emerald-700",
    openHref: "/admin/purchases",
    openLabel: "Record a purchase",
    shortcuts: [
      { label: "Purchases", href: "/admin/purchases" },
      { label: "Purchase orders", href: "/admin/purchase-orders" },
    ],
  },
  {
    key: "catalogue",
    title: "Catalogue & Products",
    description: "Add products, set prices, manage categories and generate barcodes.",
    icon: Boxes,
    accent: "text-violet-700",
    iconBg: "bg-violet-50 text-violet-700",
    openHref: "/admin/products",
    openLabel: "Manage products",
    shortcuts: [
      { label: "Products", href: "/admin/products" },
      { label: "Categories", href: "/admin/categories" },
    ],
  },
  {
    key: "reports",
    title: "Reports & Ledgers",
    description: "Sales, purchases and stock reports with CSV export for your books.",
    icon: TrendingUp,
    accent: "text-rose-700",
    iconBg: "bg-rose-50 text-rose-700",
    openHref: "/admin/reports",
    openLabel: "Open reports",
    shortcuts: [{ label: "Reports", href: "/admin/reports" }],
  },
  {
    key: "storefront",
    title: "Storefront & Ads",
    description: "Manage store orders, edit what looks and ads shown on the online store.",
    icon: Megaphone,
    accent: "text-indigo-700",
    iconBg: "bg-indigo-50 text-indigo-700",
    openHref: "/admin/ads",
    openLabel: "Manage ads",
    shortcuts: [
      { label: "Store orders", href: "/admin/orders" },
      { label: "Site settings", href: "/admin/site-settings" },
      { label: "Ads", href: "/admin/ads" },
    ],
  },
];

export default function AdminHomePage() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            What do you want to manage now?
          </h1>
          <p className="mt-1 text-muted-foreground">
            Pick an area below to jump straight in. You can switch between
            modules anytime using the menu on the left.
          </p>
        </div>

        <Link
          href="/admin/dashboard"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-amber-400 hover:text-amber-900"
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard overview
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((module) => {
          const Icon = module.icon;

          return (
            <Card key={module.key} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className={`rounded-lg p-3 ${module.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>

                <Link
                  href={module.openHref}
                  className={`inline-flex shrink-0 items-center gap-1 text-sm font-semibold ${module.accent} transition hover:underline`}
                >
                  {module.openLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <h2 className="mt-4 text-lg font-bold tracking-tight">
                {module.title}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {module.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {module.shortcuts.map((shortcut) => (
                  <Link
                    key={shortcut.href}
                    href={shortcut.href}
                    className="rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-900"
                  >
                    {shortcut.label}
                  </Link>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold">New here? Sell your first item in 3 steps:</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Print barcode labels &rarr; scan at the till &rarr; manage your catalogue.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/barcodes"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              1 · Print barcode labels
            </Link>
            <Link
              href="/admin/invoices"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              2 · Scan at Invoice / POS
            </Link>
            <Link
              href="/admin/products"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              3 · Manage catalogue
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}