"use client";
import Link from "next/link";
import {
  BarChart3,
  Beaker,
  Boxes,
  ClipboardCheck,
  Factory,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";

const menuSections = [
  {
    title: "",
    items: [
      {
        name: "Dashboard",
        icon: LayoutDashboard,
        href: "/",
      },
    ],
  },
  {
    title: "INVENTORY",
    items: [
      {
        name: "Raw Materials",
        icon: FlaskConical,
        href: "/raw-materials",
      },
      {
        name: "Inventory",
        icon: Boxes,
        href: "/inventory",
      },
      {
        name: "Lots",
        icon: Boxes,
        href: "/lots",
      },
      {
        name: "Adjustments",
        icon: Package,
        href: "/adjustments",
      },
    ],
  },
  {
    title: "PURCHASING",
    items: [
      {
        name: "Suppliers",
        icon: Truck,
        href: "/suppliers",
      },
      {
        name: "Purchases",
        icon: ShoppingCart,
        href: "/purchases",
      },
      {
        name: "Purchase Orders",
        icon: FileText,
        href: "/purchase-orders",
      },
    ],
  },
  {
    title: "MANUFACTURING",
    items: [
      {
        name: "Formulas",
        icon: Beaker,
        href: "/formulas",
      },
      {
        name: "Production",
        icon: Factory,
        href: "/production",
      },
      {
        name: "Batches",
        icon: Package,
        href: "/batches",
      },
    ],
  },
  {
    title: "QUALITY",
    items: [
      {
        name: "Quality Control",
        icon: ClipboardCheck,
        href: "/qc",
      },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      {
        name: "Reports",
        icon: BarChart3,
        href: "/reports",
      },
      {
        name: "Users",
        icon: Users,
        href: "/users",
      },
      {
        name: "Settings",
        icon: Settings,
        href: "/settings",
      },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <div>
          <h1 className="text-lg font-bold tracking-tight">NaranScents</h1>
          <p className="text-xs text-muted-foreground">
            Fragrance Management
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {menuSections.map((section) => (
            <div key={section.title || "main"}>
              {section.title && (
                <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground">
                  {section.title}
                </p>
              )}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t p-4">
        <div className="rounded-lg bg-muted p-3">
          <p className="text-sm font-medium">NaranScents</p>
          <p className="text-xs text-muted-foreground">
            Management System
          </p>
        </div>
      </div>
    </aside>
  );
}