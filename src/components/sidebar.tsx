"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  BarChart3,
  Beaker,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Factory,
  FileText,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  Truck,
  Users,
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
        name: "Dashboard",
        icon: LayoutDashboard,
        href: "/admin",
      },
    ],
  },
  {
    title: "INVENTORY",
    items: [
      {
        name: "Raw Materials",
        icon: FlaskConical,
        href: "/admin/raw-materials",
      },
      {
        name: "Inventory",
        icon: Boxes,
        href: "/admin/inventory",
      },
      {
        name: "Lots",
        icon: Boxes,
        href: "/admin/lots",
      },
      {
        name: "Adjustments",
        icon: Package,
        href: "/admin/adjustments",
      },
    ],
  },
  {
    title: "PURCHASING",
    items: [
      {
        name: "Suppliers",
        icon: Truck,
        href: "/admin/suppliers",
      },
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
        name: "Recommendations",
        icon: Sparkles,
        href: "/admin/recommendations",
      },
    ],
  },
  {
    title: "MANUFACTURING",
    items: [
      {
        name: "Formulas",
        icon: Beaker,
        href: "/admin/formulas",
      },
      {
        name: "Production",
        icon: Factory,
        href: "/admin/production",
      },
      {
        name: "Batches",
        icon: Package,
        href: "/admin/batches",
      },
    ],
  },
  {
    title: "STORE",
    items: [
      {
        name: "Orders",
        icon: ClipboardList,
        href: "/admin/orders",
      },
    ],
  },
  {
    title: "QUALITY",
    items: [
      {
        name: "Quality Control",
        icon: ClipboardCheck,
        href: "/admin/qc",
      },
      {
        name: "QC Records",
        icon: ClipboardList,
        href: "/admin/qc-records",
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
        adminOnly: false,
      },
      {
        name: "Users",
        icon: Users,
        href: "/admin/users",
        adminOnly: true,
      },
      {
        name: "Settings",
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
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (pathname === "/admin/login") return;

    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.success) setUser(d.data);
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
                {section.items
                  .filter((item) => !item.adminOnly || isAdmin)
                  .map((item) => {
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
            <p className="text-sm font-medium">NaranScents</p>
            <p className="text-xs text-muted-foreground">Management System</p>
          </div>
        )}
      </div>
    </aside>
  );
}