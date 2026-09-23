"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  BarChart3,
  Barcode,
  Boxes,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Megaphone,
  Moon,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Star,
  Sun,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { isAdminRole } from "@/lib/roles";

type NavItem = {
  name: string;
  icon: LucideIcon;
  href: string;
  adminOnly?: boolean;
};

type MenuSection = {
  title: string;
  items: NavItem[];
};

const menuSections: MenuSection[] = [
  {
    title: "",
    items: [
      {
        name: "Manage",
        icon: LayoutGrid,
        href: "/admin",
      },
      {
        name: "Overview",
        icon: LayoutDashboard,
        href: "/admin/dashboard",
      },
    ],
  },
  {
    title: "CATALOGUE",
    items: [
      {
        name: "Products",
        icon: Package,
        href: "/admin/products",
      },
      {
        name: "Featured",
        icon: Star,
        href: "/admin/featured",
      },
      {
        name: "Barcode Labels",
        icon: Barcode,
        href: "/admin/barcodes",
      },
      {
        name: "Catalog",
        icon: Package,
        href: "/admin/supplier-catalog",
      },
      {
        name: "Trades",
        icon: Wrench,
        href: "/admin/trades",
      },
    ],
  },
  {
    title: "INVENTORY",
    items: [
      {
        name: "Stock",
        icon: Boxes,
        href: "/admin/inventory",
      },
    ],
  },
  {
    title: "PURCHASING",
    items: [
      {
        name: "Purchases",
        icon: ShoppingCart,
        href: "/admin/purchases",
      },
      {
        name: "Purchase Orders",
        icon: FileText,
        href: "/admin/purchase-orders",
      },
      {
        name: "Suppliers",
        icon: Truck,
        href: "/admin/suppliers",
      },
    ],
  },
  {
    title: "SALES",
    items: [
      {
        name: "Customers",
        icon: Users,
        href: "/admin/customers",
      },
      {
        name: "Orders",
        icon: ClipboardList,
        href: "/admin/orders",
      },
      {
        name: "Invoice / POS",
        icon: Receipt,
        href: "/admin/invoices",
      },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      {
        name: "Reports",
        icon: BarChart3,
        href: "/admin/reports",
      },
      {
        name: "Ads",
        icon: Megaphone,
        href: "/admin/ads",
      },
      {
        name: "Site Settings",
        icon: Settings,
        href: "/admin/site-settings",
        adminOnly: true,
      },
      {
        name: "Users",
        icon: Users,
        href: "/admin/users",
        adminOnly: true,
      },
      {
        name: "Account Settings",
        icon: Settings,
        href: "/admin/settings",
        adminOnly: true,
      },
    ],
  },
];

type AuthUser = {
  id: string;
  username: string;
  name: string | null;
  role: string;
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasCategories, setHasCategories] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") return;

    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.success) setUser(d.data);
      })
      .catch(() => {});

    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const cats = Array.isArray(data) ? data : (data?.data ?? []);
        setHasCategories(cats.length > 0);
      })
      .catch(() => {});
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/admin/login");
    router.refresh();
  }

  if (pathname === "/admin/login") return null;

  const isAdmin = user ? isAdminRole(user.role) : false;

  const navSections: MenuSection[] = menuSections.map((section) => {
    if (section.title === "CATALOGUE" && hasCategories) {
      return {
        ...section,
        items: [
          ...section.items,
          {
            name: "Categories",
            icon: LayoutGrid,
            href: "/admin/categories",
          },
        ],
      };
    }
    return section;
  });

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Civil Mart</h1>
          <p className="text-xs text-muted-foreground">
            Construction &amp; Building Materials
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {navSections.map((section) => (
            <div key={section.title || "main"}>
              {section.title && (
                <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground">
                  {section.title}
                </p>
              )}

              <div className="space-y-1">
                {section.items
                  .filter((item) => !item.adminOnly || isAdmin)
                  .map((item) => {
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted ${
                          pathname === item.href
                            ? "bg-muted font-medium text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
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

      <div className="border-t p-2">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
      </div>

      <div className="border-t p-4">
        {user ? (
          <div className="space-y-2">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium">{user.name || user.username}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {user.role.toLowerCase().replace("_", " ")}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        ) : (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium">Civil Mart</p>
            <p className="text-xs text-muted-foreground">Store Management</p>
          </div>
        )}
      </div>
    </aside>
  );
}