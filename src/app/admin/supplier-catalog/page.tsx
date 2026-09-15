"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Pencil,
  Plus,
  PowerOff,
  Printer,
  Save,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";
import { BarcodePrintArea } from "@/components/barcode-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRODUCT_UNITS } from "@/lib/catalog";

type Supplier = {
  id: string;
  name: string;
  code: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  tradeIds: string[];
  isActive: boolean;
};

type Trade = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  _count?: { categories: number };
};

type Brand = {
  id: string;
  name: string;
  categoryId: string | null;
  active: boolean;
};

type Category = {
  id: string;
  name: string;
  group: string | null;
  tradeId: string | null;
  trade?: { id: string; name: string; slug: string } | null;
};

type TreeProduct = {
  id: string;
  code: string;
  name: string;
  price: number | null;
  unit: string;
  unitLabel: string;
  categoryId: string | null;
  categoryName: string | null;
  isFeatured: boolean;
  status: string;
  stockQuantity: number;
  reorderLevel: number | null;
  barcode: string | null;
};

type SupplierProductLine = {
  productId: string;
  brandId: string | null;
  brandName: string | null;
  rateListPrice: number | null;
  discount: number;
  wholesalePrice: number | null;
  retailPrice: number | null;
  notes: string | null;
};

type SupplierProductItem = {
  productId: string;
  brandId?: string | null;
  brand?: { name?: string | null } | null;
  rateListPrice?: unknown;
  discount?: unknown;
  wholesalePrice?: unknown;
  retailPrice?: unknown;
  notes?: string | null;
};

type BrandOption = {
  id: string;
  name: string;
  inCategory: boolean;
  categoryId: string | null;
};

const EMPTY_FORM: SupplierProductLine = {
  productId: "",
  brandId: null,
  brandName: null,
  rateListPrice: null,
  discount: 0,
  wholesalePrice: null,
  retailPrice: null,
  notes: null,
};

function toDecimalOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toDecimalOrZero(value: unknown): number {
  const num = toDecimalOrNull(value);
  return num === null || num < 0 ? 0 : num;
}

function TriCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: React.ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate && !disabled;
    }
  }, [indeterminate, disabled]);

  return (
    <label
      className={`flex items-center gap-2 ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="h-4 w-4 shrink-0 rounded border-input accent-amber-600"
      />
      <span className="flex min-w-0 items-center gap-2">{label}</span>
    </label>
  );
}

export default function SupplierCatalogPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<TreeProduct[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [lines, setLines] = useState<SupplierProductLine[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsedTrades, setCollapsedTrades] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [catalogSupplierId, setCatalogSupplierId] = useState("");
  const [addingForTradeId, setAddingForTradeId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [editingTradeId, setEditingTradeId] = useState("");
  const [editingTradeName, setEditingTradeName] = useState("");
  const [addingTrade, setAddingTrade] = useState(false);
  const [newTradeName, setNewTradeName] = useState("");
  const [addCategoryTradeId, setAddCategoryTradeId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addProductCategoryId, setAddProductCategoryId] = useState("");
  const [newProductCode, setNewProductCode] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductUnit, setNewProductUnit] = useState("PIECE");
  const [printingBarcodes, setPrintingBarcodes] = useState(false);
  const [error, setError] = useState("");

  const fetchInitial = useCallback(async () => {
    try {
      const unwrap = (j: Record<string, unknown>) =>
        Array.isArray(j) ? j : (j.data ?? []) as unknown[];
      const [suppliersData, tradesData, categoriesData, productsData, brandsData] =
        await Promise.all([
          fetch("/api/suppliers").then((r) => r.json()).then(unwrap),
          fetch("/api/trades").then((r) => r.json()).then(unwrap),
          fetch("/api/categories?withCounts=true").then((r) => r.json()).then(unwrap),
          fetch("/api/products?limit=2000").then((r) => r.json()).then(unwrap),
          fetch("/api/brands?active=true").then((r) => r.json()).then(unwrap),
        ]);

      setSuppliers(suppliersData as Supplier[]);
      const sortedTrades = (tradesData as Trade[]).sort((a, b) => a.sortOrder - b.sortOrder);
      setTrades(sortedTrades);
      setCollapsedTrades(new Set(sortedTrades.map((t) => t.id)));
      setCategories(categoriesData as Category[]);
      setProducts(
        (productsData as Record<string, unknown>[])
          .filter((p) => p.status === "ACTIVE")
          .map((p) => ({
            id: String(p.id),
            code: String(p.code),
            name: String(p.name),
            price: p.price != null ? Number(p.price) : null,
            unit: String(p.unit),
            unitLabel: String(p.unitLabel ?? p.unit),
            categoryId: (p.categoryId as string) ?? null,
            categoryName: (p.category as { name?: string } | null)?.name ?? null,
            isFeatured: Boolean(p.isFeatured),
            status: String(p.status),
            stockQuantity: Number(p.stockQuantity ?? 0),
            reorderLevel: p.reorderLevel != null ? Number(p.reorderLevel) : null,
            barcode: p.barcode != null ? String(p.barcode) : null,
          }))
      );
      setBrands(
        (brandsData as unknown as Brand[]).map((b) => ({
          id: b.id,
          name: b.name,
          inCategory: Boolean(b.categoryId),
          categoryId: b.categoryId ?? null,
        }))
      );
      setCollapsedTrades(new Set(sortedTrades.map((t) => t.id)));
    } catch (e) {
      console.error("Failed to load supplier catalog data:", e);
      setError("Failed to load the supplier catalogue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchInitial();
    })();
  }, [fetchInitial]);

  useEffect(() => {
    if (!supplierId) {
      requestAnimationFrame(() => {
        setLines([]);
        setSelected(new Set());
      });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          `/api/suppliers/${supplierId}/products`
        );
        const data = await response.json();

        if (!response.ok) {
          if (!cancelled) setError(data.error || "Failed to load rate list.");
          return;
        }

        const items = Array.isArray(data.items) ? data.items : [];

        if (!cancelled) {
          setLines(
            items.map((item: SupplierProductItem) => ({
              productId: item.productId,
              brandId: item.brandId ?? null,
              brandName: item.brand?.name ?? null,
              rateListPrice: toDecimalOrNull(item.rateListPrice),
              discount: toDecimalOrZero(item.discount),
              wholesalePrice: toDecimalOrNull(item.wholesalePrice),
              retailPrice: toDecimalOrNull(item.retailPrice),
              notes: item.notes ?? null,
            }))
          );

          const linked = new Set<string>(
            items.map((item: SupplierProductItem) => String(item.productId))
          );
          setSelected(linked);
        }
      } catch (e) {
        console.error("Failed to load supplier rate list:", e);

        if (!cancelled) setError("Failed to load the supplier rate list.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supplierId]);

  const tradeScopedCategories = useMemo(() => {
    if (!supplierId) return categories;

    const tradeIds = new Set(
      suppliers.find((s) => s.id === supplierId)?.tradeIds ?? []
    );

    if (tradeIds.size === 0) return categories;

    return categories.filter((category) => {
      const catTrade = category.tradeId ?? null;
      if (!catTrade) return false;
      return tradeIds.has(catTrade);
    });
  }, [supplierId, suppliers, categories]);

  const filteredTree = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) {
      return tradeScopedCategories;
    }

    return tradeScopedCategories.filter((category) => {
      if (category.name.toLowerCase().includes(term)) return true     ;

      const productMatch = products
        .filter((p) => p.categoryId === category.id)
        .some(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            p.code.toLowerCase().includes(term)
        );

      return productMatch;
    });
  }, [categories, products, search]);

  const selectedCount = products.filter((p) => selected.has(p.id)).length;

  function toggleLeaf(category: Category) {
    const ids = products
      .filter((p) => p.categoryId === category.id)
      .map((p) => p.id);

    setSelected((current) => {
      const next = new Set(current);
      const all = ids.every((id) => next.has(id));

      for (const id of ids) {
        if (all) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }

      return next;
    });
  }

  function toggleSingle(productId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }

  function isLeafChecked(category: Category): boolean {
    const ids = products.filter((p) => p.categoryId === category.id);
    return ids.length > 0 && ids.every((p) => selected.has(p.id));
  }

  function isLeafIndeterminate(category: Category): boolean {
    const ids = products.filter((p) => p.categoryId === category.id);
    return ids.some((p) => selected.has(p.id)) && !isLeafChecked(category);
  }

  function productsForCategory(categoryId: string): TreeProduct[] {
    return products.filter((p) => p.categoryId === categoryId);
  }

  function productsForCategoryArray(all: TreeProduct[], selectedIds: Set<string>): TreeProduct[] {
    return all.filter((p) => {
      const cat = categories.find((c) => c.id === p.categoryId);
      if (!cat) return false;
      return productsForCategory(cat.id).some((cp) => selectedIds.has(cp.id));
    });
  }

  function getLine(productId: string): SupplierProductLine {
    return (
      lines.find((l) => l.productId === productId) ?? {
        ...EMPTY_FORM,
        productId,
      }
    );
  }

  function setLine(productId: string, patch: Partial<SupplierProductLine>) {
    setLines((current) => {
      const next = [...current];
      const index = next.findIndex((l) => l.productId === productId);

      if (index === -1) {
        next.push({ ...EMPTY_FORM, productId, ...patch });
      } else {
        next[index] = { ...next[index], ...patch };
      }

      return next;
    });
  }

  function selectedProducts(): TreeProduct[] {
    return products.filter((p) => selected.has(p.id));
  }

  async function saveRateList() {
    const supplier = suppliers.find((s) => s.id === supplierId);

    if (!supplier) {
      setNotice("Please select a supplier first.");
      return;
    }

    setSaving(true);
    setNotice("Saving rate list…");

    const items = selectedProducts().map((product) => {
      const line = getLine(product.id);

      return {
        action: "set",
        productId: product.id,
        brandId: line.brandId ?? "generic",
        rate: line.rateListPrice,
        discount: line.discount,
        wholesalePrice: line.wholesalePrice,
        retailPrice: line.retailPrice,
        notes: line.notes,
      };
    });

    try {
      const response = await fetch(`/api/suppliers/${supplierId}/products`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await response.json();

      if (!response.ok) {
        setNotice(data.error || "Failed to save the rate list.");
        setSaving(false);
        return;
      }

      setNotice(
        `Rate list saved: ${data.created ?? 0} created, ${
          data.updated ?? 0
        } updated, ${data.deleted ?? 0} removed.`
      );
    } catch (e) {
      console.error("Failed to save rate list:", e);
      setNotice("Network error while saving the rate list.");
    } finally {
      setSaving(false);
    }
  }

  function isTradeChecked(trade: Trade): boolean {
    const ids = products.filter((p) => {
      const cat = categories.find((c) => c.id === p.categoryId);
      return cat?.tradeId === trade.id;
    }).map((p) => p.id);
    return ids.length > 0 && ids.every((id) => selected.has(id));
  }

  function openAddSupplier(tradeId: string) {
    setAddingForTradeId(tradeId);
    setNewSupplierName("");
    setNotice("");
  }

  async function createSupplier(tradeId: string) {
    if (!newSupplierName.trim()) {
      setNotice("Supplier name is required.");
      return;
    }

      setSaving(true);
      setNotice("");

    try {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSupplierName.trim(),
          tradeId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setNotice(data.error || "Failed to create supplier.");
        return;
      }

      setAddingForTradeId("");
      setNewSupplierName("");
      setNotice(`Created supplier "${newSupplierName.trim()}".`);
      await fetchInitial();
    } catch (e) {
      console.error("Failed to create supplier:", e);
      setNotice("Failed to create supplier.");
    } finally {
      setSaving(false);
    }
  }

  function toggleCatalog(supplierId: string) {
    setCatalogSupplierId((current) =>
      current === supplierId ? "" : supplierId
    );
    setSupplierId(supplierId);
    setNotice("");
  }

  function startEditSupplier(supplierId: string) {
    setCatalogSupplierId(supplierId);
    setSupplierId(supplierId);
    setNotice("");
  }

  async function deactivateSupplier(supplierId: string) {
    setSaving(true);

    try {
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setNotice(data.error || "Failed to deactivate supplier.");
        return;
      }

      await fetchInitial();
    } catch (e) {
      console.error("Failed to deactivate supplier:", e);
      setNotice("Failed to deactivate supplier.");
    } finally {
      setSaving(false);
    }
  }

  function startEditTrade(trade: Trade) {
    setEditingTradeId(trade.id);
    setEditingTradeName(trade.name);
  }

  function cancelEditTrade() {
    setEditingTradeId("");
    setEditingTradeName("");
  }

  async function createTrade() {
    const trimmed = newTradeName.trim();
    if (!trimmed) {
      setNotice("Trade name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) {
        setNotice(data.error || "Failed to create trade.");
        return;
      }
      setAddingTrade(false);
      setNewTradeName("");
      setNotice(`Trade "${trimmed}" created.`);
      await fetchInitial();
    } catch (e) {
      console.error("Failed to create trade:", e);
      setNotice("Failed to create trade.");
    } finally {
      setSaving(false);
    }
  }

  async function createCategory(tradeId: string) {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setNotice("Category name cannot be empty.");
      return;
    }
    const tradeName = trades.find((t) => t.id === tradeId)?.name ?? "General";
    setSaving(true);
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, tradeId, group: tradeName }),
      });
      const data = await response.json();
      if (!response.ok) {
        setNotice(data.error || "Failed to create category.");
        return;
      }
      setAddCategoryTradeId("");
      setNewCategoryName("");
      setNotice(`Category "${trimmed}" created.`);
      await fetchInitial();
    } catch (e) {
      console.error("Failed to create category:", e);
      setNotice("Failed to create category.");
    } finally {
      setSaving(false);
    }
  }

  async function createProduct(categoryId: string) {
    const code = newProductCode.trim();
    const name = newProductName.trim();
    if (!code || !name) {
      setNotice("Product code and name are required.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          unit: newProductUnit,
          categoryId,
          status: "ACTIVE",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setNotice(data.error || "Failed to create product.");
        return;
      }
      setAddProductCategoryId("");
      setNewProductCode("");
      setNewProductName("");
      setNewProductUnit("PIECE");
      setNotice(`Product "${name}" created.`);
      await fetchInitial();
    } catch (e) {
      console.error("Failed to create product:", e);
      setNotice("Failed to create product.");
    } finally {
      setSaving(false);
    }
  }

  async function saveTrade(tradeId: string) {
    const trimmed = editingTradeName.trim();
    if (!trimmed) {
      setNotice("Trade name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/trades/${tradeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) {
        setNotice(data.error || "Failed to update trade.");
        return;
      }
      setEditingTradeId("");
      setEditingTradeName("");
      setNotice(`Trade renamed to "${trimmed}".`);
      await fetchInitial();
    } catch (e) {
      console.error("Failed to update trade:", e);
      setNotice("Failed to update trade.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateTrade(tradeId: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/trades/${tradeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      const data = await response.json();
      if (!response.ok) {
        setNotice(data.error || "Failed to deactivate trade.");
        return;
      }
      setNotice("Trade deactivated.");
      await fetchInitial();
    } catch (e) {
      console.error("Failed to deactivate trade:", e);
      setNotice("Failed to deactivate trade.");
    } finally {
      setSaving(false);
    }
  }

  async function createPurchaseOrder() {
    if (!catalogSupplierId) {
      setNotice("Expand a supplier first to create a purchase order.");
      return;
    }

    const selectedItems = selectedProducts().filter((p) => {
      const reorder = p.reorderLevel;
      return reorder != null && reorder > p.stockQuantity;
    });

    if (selectedItems.length === 0) {
      setNotice("No selected products need reordering (reorder level not exceeded).");
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const poNumber = `PO-${dateStr}-${now.getTime().toString().slice(-4)}`;

    const items = selectedItems.map((product) => {
      const line = getLine(product.id);
      const qty = Math.ceil((product.reorderLevel! - product.stockQuantity));
      const purchasePrice =
        line.rateListPrice != null
          ? Math.round(line.rateListPrice * (1 - line.discount / 100) * 100) / 100
          : null;
      return {
        productId: product.id,
        quantity: qty,
        unit: product.unit,
        estimatedCostPerUnit: purchasePrice,
      };
    });

    setSaving(true);
    try {
      const response = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poNumber,
          supplierId: catalogSupplierId,
          orderDate: now.toISOString(),
          items,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setNotice(data.error || "Failed to create purchase order.");
        return;
      }
      setNotice(`Purchase order ${poNumber} created with ${items.length} item(s).`);
    } catch (e) {
      console.error("Failed to create purchase order:", e);
      setNotice("Failed to create purchase order.");
    } finally {
      setSaving(false);
    }
  }

  function printSelectedBarcodes() {
    const items = selectedProducts().filter((p) => p.barcode);
    if (items.length === 0) {
      setNotice("No selected products have barcodes.");
      return;
    }
    setPrintingBarcodes(true);
  }

  useEffect(() => {
    if (!printingBarcodes) return;
    const timer = setTimeout(() => {
      window.print();
      setPrintingBarcodes(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [printingBarcodes]);

  function generateWholesalePdf() {
    const items = selectedProducts();
    if (items.length === 0) {
      setNotice("No products selected.");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape" });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 20;

    doc.setFontSize(16);
    doc.text("Wholesale Rates", margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, y);
    y += 10;

    const colWidths = [12, 80, 50, 40, 35];
    const headers = ["#", "Product", "Unit", "Variant", "Wholesale Price"];

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    let x = margin;
    headers.forEach((h, i) => {
      doc.text(h, x, y);
      x += colWidths[i];
    });
    y += 1;
    doc.setDrawColor(0);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    items.forEach((product, idx) => {
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 20;
      }

      const line = getLine(product.id);
      const wholesale = line.wholesalePrice != null ? line.wholesalePrice.toFixed(2) : "-";

      x = margin;
      doc.text(String(idx + 1), x, y); x += colWidths[0];
      doc.text(product.name, x, y); x += colWidths[1];
      doc.text(product.unitLabel || product.unit, x, y); x += colWidths[2];
      doc.text("-", x, y); x += colWidths[3];
      doc.text(wholesale, x, y);

      y += 5;
    });

    doc.save(`wholesale-rates-${catalogSupplierId}.pdf`);
    setNotice(`PDF generated with ${items.length} item(s).`);
  }

  function isTradeIndeterminate(trade: Trade): boolean {
    const ids = products.filter((p) => {
      const cat = categories.find((c) => c.id === p.categoryId);
      return cat?.tradeId === trade.id;
    }).map((p) => p.id);
    return ids.some((id) => selected.has(id)) && !isTradeChecked(trade);
  }

  function toggleTrade(trade: Trade) {
    const ids = products.filter((p) => {
      const cat = categories.find((c) => c.id === p.categoryId);
      return cat?.tradeId === trade.id;
    }).map((p) => p.id);

    setSelected((current) => {
      const next = new Set(current);
      const all = ids.length > 0 && ids.every((id) => next.has(id));

      for (const id of ids) {
        if (all) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }

      return next;
    });
  }

  function toggleTradeCollapsed(tradeId: string) {
    setCollapsedTrades((current) => {
      const next = new Set(current);

      if (next.has(tradeId)) {
        next.delete(tradeId);
      } else {
        next.add(tradeId);
      }

      return next;
    });
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-amber-600" />
          <h1 className="text-xl font-bold">Supplier Catalog</h1>
        </div>
        <div className="flex items-center gap-2">
          {notice && (
            <p className="text-sm text-muted-foreground">{notice}</p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddingTrade(!addingTrade)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Trade
          </Button>
        </div>
      </div>

      {addingTrade && (
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <Label className="text-xs text-muted-foreground">New trade</Label>
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={newTradeName}
              onChange={(e) => setNewTradeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void createTrade();
                if (e.key === "Escape") setAddingTrade(false);
              }}
              placeholder="Trade name"
            />
            <Button size="sm" disabled={saving} onClick={() => void createTrade()}>
              {saving ? "Creating…" : "Create"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAddingTrade(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {selectedCount > 0 && catalogSupplierId && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-3 shadow-md">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="tabular-nums">
              {selectedCount} selected
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              <X className="mr-1 h-3 w-3" />
              Deselect All
            </Button>
            {(() => {
              const reorderCount = selectedProducts().filter(
                (p) => p.reorderLevel != null && p.reorderLevel > p.stockQuantity
              ).length;
              return reorderCount > 0 ? (
                <Badge variant="outline" className="tabular-nums text-amber-600">
                  {reorderCount} need reorder
                </Badge>
              ) : null;
            })()}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={saving}>
                <ShoppingCart className="mr-1 h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void createPurchaseOrder()}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Create Purchase Order
              </DropdownMenuItem>
              <DropdownMenuItem onClick={generateWholesalePdf}>
                <FileText className="mr-2 h-4 w-4" />
                Wholesale Rates PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={printSelectedBarcodes}>
                <Printer className="mr-2 h-4 w-4" />
                Print Barcodes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="space-y-4">
        {trades
          .filter((trade) => trade.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((trade) => {
            const tradeIds = new Set([trade.id]);
            const tradeSuppliers = suppliers.filter((s) =>
              (s.tradeIds ?? []).some((id) => tradeIds.has(id))
            );
            const tradeProductsCount = products.filter((p) => {
              const cat = categories.find((c) => c.id === p.categoryId);
              return cat?.tradeId === trade.id;
            }).length;

            return (
              <Card key={trade.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {editingTradeId === trade.id ? (
                        <>
                          <Input
                            autoFocus
                            value={editingTradeName}
                            onChange={(e) => setEditingTradeName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveTrade(trade.id);
                              if (e.key === "Escape") cancelEditTrade();
                            }}
                            className="h-8 w-48 text-sm"
                          />
                          <Button size="sm" disabled={saving} onClick={() => void saveTrade(trade.id)}>
                            <Save className="mr-1 h-3 w-3" />
                            {saving ? "Saving…" : "Save"}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={cancelEditTrade}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <CardTitle className="text-sm">{trade.name}</CardTitle>
                          <Badge variant="secondary" className="tabular-nums">
                            {tradeSuppliers.length} supplier
                            {tradeSuppliers.length === 1 ? "" : "s"}
                          </Badge>
                          <Badge variant="outline" className="tabular-nums">
                            {tradeProductsCount} products
                          </Badge>
                        </>
                      )}
                    </div>
                    {editingTradeId !== trade.id && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAddCategoryTradeId(trade.id)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add Category
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditTrade(trade)}
                        >
                          <Pencil className="mr-1 h-3 w-3" />
                          Edit Trade
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void deactivateTrade(trade.id)}
                        >
                          <PowerOff className="mr-1 h-3 w-3" />
                          Deactivate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAddSupplier(trade.id)}
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Add Supplier
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tradeSuppliers.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No suppliers yet for this trade. Add one to start their
                      rate list.
                    </p>
                  )}

                  {addingForTradeId === trade.id && (
                    <div className="space-y-2 rounded-md border border-dashed p-3">
                      <Label className="text-xs text-muted-foreground">
                        New supplier for {trade.name}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          autoFocus
                          value={newSupplierName}
                          onChange={(e) => setNewSupplierName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              void createSupplier(trade.id);
                            }
                          }}
                          placeholder="Supplier name"
                        />
                        <Button
                          size="sm"
                          disabled={saving}
                          onClick={() => void createSupplier(trade.id)}
                        >
                          {saving ? "Creating…" : "Create"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAddingForTradeId("")}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {tradeSuppliers.map((supplier) => (
                    <div
                      key={supplier.id}
                      className="rounded-md border bg-background"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleCatalog(supplier.id)}
                            aria-label={`${supplier.name} catalogue`}
                            className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                          >
                            {catalogSupplierId === supplier.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          <span
                            className={`min-w-0 truncate text-sm font-medium ${
                              !supplier.isActive
                                ? "text-muted-foreground line-through"
                                : ""
                            }`}
                          >
                            {supplier.name}
                          </span>
                          {!supplier.isActive && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              startEditSupplier(supplier.id)
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void deactivateSupplier(supplier.id)}
                          >
                            {supplier.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </div>

                      {catalogSupplierId === supplier.id && (
                        <div className="border-t px-3 py-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              Select products supplied by {supplier.name}:
                            </p>
                            <Button
                              size="sm"
                              onClick={saveRateList}
                              disabled={saving || selectedCount === 0}
                            >
                              <Save className="mr-1 h-3 w-3" />
                              {saving ? "Saving…" : "Save"}
                            </Button>
                          </div>
                          <div className="relative">
                            <Input
                              placeholder="Search products."
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>

                          {filteredTree.length === 0 ? (
                            <p className="py-4 text-center text-xs text-muted-foreground">
                              No products match.
                            </p>
                          ) : (
                            <div className="space-y-3 max-h-96 overflow-auto">
                              <div className="rounded-lg border p-2 space-y-2">
                                <div className="flex items-center gap-2">
                                  <TriCheckbox
                                    checked={isTradeChecked(trade)}
                                    indeterminate={isTradeIndeterminate(trade)}
                                    disabled={filteredTree.filter((c) => c.tradeId === trade.id && products.some((p) => p.categoryId === c.id)).length === 0}
                                    onChange={() => toggleTrade(trade)}
                                    label={<span className="font-semibold text-xs">{trade.name}</span>}
                                  />
                                  <Badge variant="outline" className="text-[10px]">
                                    {filteredTree.filter((c) => c.tradeId === trade.id && products.some((p) => p.categoryId === c.id)).length}
                                  </Badge>
                                </div>
                                {filteredTree
                                  .filter((c) => c.tradeId === trade.id)
                                  .map((category) => (
                                    <div key={category.id} className="ml-4 space-y-1">
                                      <div className="flex items-center gap-2">
                                        <TriCheckbox
                                          checked={isLeafChecked(category)}
                                          indeterminate={isLeafIndeterminate(category)}
                                          disabled={productsForCategory(category.id).length === 0}
                                          onChange={() => toggleLeaf(category)}
                                          label={<span className="text-xs text-muted-foreground">{category.name}</span>}
                                        />
                                        <Badge variant="outline" className="text-[10px]">{productsForCategory(category.id).length}</Badge>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 px-1.5 text-[10px]"
                                          onClick={() => setAddProductCategoryId(category.id)}
                                        >
                                          <Plus className="mr-0.5 h-2.5 w-2.5" />
                                          Add Product
                                        </Button>
                                      </div>
                                      {productsForCategory(category.id).map((product) => {
                                        const line = getLine(product.id);
                                        const checked = selected.has(product.id);
                                        return (
                                          <div key={product.id} className="ml-6">
                                            <div className="flex items-center gap-2">
                                              <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleSingle(product.id)}
                                                className="h-3 w-3 rounded border-input accent-amber-600"
                                              />
                                              <span className="text-xs">{product.name}</span>
                                              <Badge variant="outline" className="text-[10px]">{product.code}</Badge>
                                            </div>
                                            {checked && (
                                              <div className="ml-5 mt-1 grid grid-cols-2 gap-1 lg:grid-cols-6">
                                                <select
                                                  value={line.brandId ?? "generic"}
                                                  onChange={(e) => setLine(product.id, { brandId: e.target.value === "generic" ? null : e.target.value, brandName: undefined })}
                                                  className="rounded border px-1 py-0.5 text-[11px]"
                                                >
                                                  <option value="generic">Generic</option>
                                                  {brands.filter((b) => !b.inCategory || b.categoryId === product.categoryId).map((brand) => (
                                                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                                                  ))}
                                                </select>
                                                <Input value={line.rateListPrice ?? ""} onChange={(e) => setLine(product.id, { rateListPrice: toDecimalOrNull(e.target.value) })} placeholder="List Price" inputMode="decimal" className="h-6 text-[11px]" />
                                                <Input value={line.discount ?? 0} onChange={(e) => setLine(product.id, { discount: toDecimalOrZero(e.target.value) })} placeholder="Discount %" inputMode="decimal" className="h-6 text-[11px]" />
                                                <Input
                                                  value={
                                                    line.rateListPrice != null && line.discount != null
                                                      ? Math.round(line.rateListPrice * (1 - line.discount / 100) * 100) / 100
                                                      : ""
                                                  }
                                                  readOnly
                                                  placeholder="Purchase Price"
                                                  inputMode="decimal"
                                                  className="h-6 text-[11px] bg-muted"
                                                />
                                                <Input value={line.wholesalePrice ?? ""} onChange={(e) => setLine(product.id, { wholesalePrice: toDecimalOrNull(e.target.value) })} placeholder="Wholesale" inputMode="decimal" className="h-6 text-[11px]" />
                                                <Input value={line.retailPrice ?? ""} onChange={(e) => setLine(product.id, { retailPrice: toDecimalOrNull(e.target.value) })} placeholder="Retail" inputMode="decimal" className="h-6 text-[11px]" />
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
      </div>

      {printingBarcodes && (
        <BarcodePrintArea
          id="catalog-print-area"
          items={
            selectedProducts()
              .filter((p) => p.barcode)
              .map((product) => {
                const line = getLine(product.id);
                return {
                  key: product.id,
                  barcode: product.barcode!,
                  name: product.name,
                  brand: line.brandName,
                  code: product.code,
                };
              })
          }
        />
      )}

      <Dialog open={!!addCategoryTradeId} onOpenChange={(open) => { if (!open) { setAddCategoryTradeId(""); setNewCategoryName(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Add Category to {trades.find((t) => t.id === addCategoryTradeId)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input
                autoFocus
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void createCategory(addCategoryTradeId); }}
                placeholder="e.g. Cement & Binding"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setAddCategoryTradeId(""); setNewCategoryName(""); }}>
                Cancel
              </Button>
              <Button size="sm" disabled={saving} onClick={() => void createCategory(addCategoryTradeId)}>
                {saving ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!addProductCategoryId} onOpenChange={(open) => { if (!open) { setAddProductCategoryId(""); setNewProductCode(""); setNewProductName(""); setNewProductUnit("PIECE"); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Add Product to {categories.find((c) => c.id === addProductCategoryId)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product Code</Label>
              <Input
                autoFocus
                value={newProductCode}
                onChange={(e) => setNewProductCode(e.target.value)}
                placeholder="e.g. CM000000001"
              />
            </div>
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void createProduct(addProductCategoryId); }}
                placeholder="e.g. PPC Cement 42.5"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={newProductUnit} onValueChange={setNewProductUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setAddProductCategoryId(""); setNewProductCode(""); setNewProductName(""); setNewProductUnit("PIECE"); }}>
                Cancel
              </Button>
              <Button size="sm" disabled={saving} onClick={() => void createProduct(addProductCategoryId)}>
                {saving ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
