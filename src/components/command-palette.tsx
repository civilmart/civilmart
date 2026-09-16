"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const pages = [
  { name: "Dashboard", href: "/admin/dashboard", keywords: "home overview" },
  { name: "Catalog", href: "/admin/supplier-catalog", keywords: "products trade category brand supplier" },
  { name: "Products", href: "/admin/products", keywords: "product list" },
  { name: "Inventory", href: "/admin/inventory", keywords: "stock adjust" },
  { name: "Purchase Orders", href: "/admin/purchase-orders", keywords: "po" },
  { name: "Purchases", href: "/admin/purchases", keywords: "purchase list" },
  { name: "Invoices", href: "/admin/invoices", keywords: "pos invoice billing" },
  { name: "Customers", href: "/admin/customers", keywords: "customer" },
  { name: "Suppliers", href: "/admin/suppliers", keywords: "supplier" },
  { name: "Categories", href: "/admin/categories", keywords: "category trade" },
  { name: "Barcodes", href: "/admin/barcodes", keywords: "barcode label print" },
  { name: "Ads", href: "/admin/ads", keywords: "ads banner" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input placeholder="Type a command or search..." className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50" />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden">
            <Command.Empty className="py-6 text-center text-sm">No results found.</Command.Empty>
            <Command.Group heading="Pages">
              {pages.map((page) => (
                <Command.Item
                  key={page.href}
                  value={`${page.name} ${page.keywords}`}
                  onSelect={() => {
                    router.push(page.href);
                    setOpen(false);
                  }}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  {page.name}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
