"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileText,
  GripVertical,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  PowerOff,
  Printer,
  Settings2,
  Save,
  ShoppingCart,
  Truck,
  Upload,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRODUCT_UNITS } from "@/lib/catalog";
import Papa from "papaparse";

type Supplier = {
  id: string;
  name: string;
  code: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
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
  unit: string;
  unitLabel: string;
  categoryId: string | null;
  categoryName: string | null;
  isFeatured: boolean;
  status: string;
  stockQuantity: number;
  reorderLevel: number | null;
  barcode: string | null;
  variants: Array<{
    id: string;
    name: string;
    sku: string;
    sizeValue: number;
    sizeUnit: string;
  }>;
};

type VariantPriceEntry = {
  rateListPrice: number | null;
  discount: number;
  wholesalePrice: number | null;
  retailPrice: number | null;
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
  variantPrices: Record<string, VariantPriceEntry>;
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
  variants?: Array<{
    variantId: string;
    rate?: unknown;
    discount?: unknown;
    wholesalePrice?: unknown;
    retailPrice?: unknown;
  }>;
  variantPrices?: Array<{
    productVariantId?: string;
    productVariant?: { id?: string } | null;
    rateListPrice?: unknown;
    discount?: unknown;
    wholesalePrice?: unknown;
    retailPrice?: unknown;
  }>;
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
  variantPrices: {},
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

function TradeSkeletonCard() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 w-3 animate-pulse rounded bg-muted" />
            <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
            <div className="h-3 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
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
  const [loadingLines, setLoadingLines] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [catalogSupplierId, setCatalogSupplierId] = useState("");
  const [addingForTradeId, setAddingForTradeId] = useState("");
  const [editingTradeId, setEditingTradeId] = useState("");
  const [editingTradeName, setEditingTradeName] = useState("");
  const [addingTrade, setAddingTrade] = useState(false);
  const [newTradeName, setNewTradeName] = useState("");
  const [manualTradeSuppliers, setManualTradeSuppliers] = useState<Record<string, string[]>>({});
  const [addCategoryTradeId, setAddCategoryTradeId] = useState("");
  const [newSupplierForm, setNewSupplierForm] = useState({
    name: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
  });
  const [newCategoryName, setNewCategoryName] = useState("");
  const [printingBarcodes, setPrintingBarcodes] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [error, setError] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{success: number; errors: string[]}>({ success: 0, errors: [] });
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);

  const [expandedVariantPricing, setExpandedVariantPricing] = useState<Set<string>>(new Set());

  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const productImageInput = useRef<HTMLInputElement>(null);
  const variantImageInputs = useRef<Map<string, HTMLInputElement>>(new Map());

  const [productDialogMode, setProductDialogMode] = useState<"add" | "edit" | null>(null);
  const [productDialogCategoryId, setProductDialogCategoryId] = useState("");
  const [productForm, setProductForm] = useState({
    id: "", name: "", code: "", description: "", unit: "PIECE", barcode: "",
    categoryId: "", imageUrl: "", isFeatured: false, status: "ACTIVE",
  });
  const [productVariants, setProductVariants] = useState<Array<{
    id: string; name: string; sizeValue: string; sizeUnit: string; sku?: string; imageUrl?: string;
  }>>([]);

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
            unit: String(p.unit),
            unitLabel: String(p.unitLabel ?? p.unit),
            categoryId: (p.categoryId as string) ?? null,
            categoryName: (p.category as { name?: string } | null)?.name ?? null,
            isFeatured: Boolean(p.isFeatured),
            status: String(p.status),
            stockQuantity: Number(p.stockQuantity ?? 0),
            reorderLevel: p.reorderLevel != null ? Number(p.reorderLevel) : null,
            barcode: p.barcode != null ? String(p.barcode) : null,
            variants: Array.isArray(p.variants)
              ? (p.variants as Array<Record<string, unknown>>).map((v) => ({
                  id: String(v.id),
                  name: String(v.name),
                  sku: String(v.sku),
                  sizeValue: Number(v.sizeValue ?? 0),
                  sizeUnit: String(v.sizeUnit ?? "UNIT"),
                }))
              : [],
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
      const params = new URLSearchParams(window.location.search);
      const supplierParam = params.get("supplier");
      if (supplierParam) {
        setSupplierId(supplierParam);
      }
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
    setLoadingLines(true);

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
            items.map((item: SupplierProductItem) => {
              const variantPrices: Record<string, VariantPriceEntry> = {};
              if (Array.isArray(item.variantPrices)) {
                for (const vp of item.variantPrices) {
                  const vid = String(vp.productVariant?.id ?? vp.productVariantId ?? "");
                  if (vid) {
                    variantPrices[vid] = {
                      rateListPrice: toDecimalOrNull(vp.rateListPrice),
                      discount: toDecimalOrZero(vp.discount),
                      wholesalePrice: toDecimalOrNull(vp.wholesalePrice),
                      retailPrice: toDecimalOrNull(vp.retailPrice),
                    };
                  }
                }
              }
              return {
                productId: item.productId,
                brandId: item.brandId ?? null,
                brandName: item.brand?.name ?? null,
                rateListPrice: toDecimalOrNull(item.rateListPrice),
                discount: toDecimalOrZero(item.discount),
                wholesalePrice: toDecimalOrNull(item.wholesalePrice),
                retailPrice: toDecimalOrNull(item.retailPrice),
                notes: item.notes ?? null,
                variantPrices,
              };
            })
          );

          const linked = new Set<string>(
            items.map((item: SupplierProductItem) => String(item.productId))
          );
          setSelected(linked);
        }
      } catch (e) {
        console.error("Failed to load supplier rate list:", e);

        if (!cancelled) setError("Failed to load the supplier rate list.");
      } finally {
        if (!cancelled) setLoadingLines(false);
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

  const gridProducts = useMemo(() => {
    const catIds = new Set(filteredTree.map((c) => c.id));
    return products
      .filter((p) => p.categoryId && catIds.has(p.categoryId))
      .sort((a, b) => {
        const catA = categories.find((c) => c.id === a.categoryId)?.name ?? "";
        const catB = categories.find((c) => c.id === b.categoryId)?.name ?? "";
        if (catA !== catB) return catA.localeCompare(catB);
        return a.name.localeCompare(b.name);
      });
  }, [products, filteredTree, categories]);

  const gridCategories = useMemo(() => {
    const seen = new Set<string>();
    return filteredTree.filter((c) => {
      if (seen.has(c.id)) return false;
      if (!gridProducts.some((p) => p.categoryId === c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [filteredTree, gridProducts]);

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

  function setVariantPrice(productId: string, variantId: string, patch: Partial<VariantPriceEntry>) {
    setLines((current) => {
      const next = [...current];
      const index = next.findIndex((l) => l.productId === productId);
      const line = index >= 0 ? next[index] : { ...EMPTY_FORM, productId };

      const vp = { ...(line.variantPrices[variantId] ?? { rateListPrice: null, discount: 0, wholesalePrice: null, retailPrice: null }), ...patch };

      const updated = { ...line, variantPrices: { ...line.variantPrices, [variantId]: vp } };

      if (index === -1) {
        next.push(updated);
      } else {
        next[index] = updated;
      }

      return next;
    });
  }

  function toggleVariantPricing(productId: string) {
    setExpandedVariantPricing((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
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
      const hasVariants = product.variants.length > 0;

      return {
        action: "set",
        productId: product.id,
        brandId: line.brandId ?? "generic",
        rate: hasVariants ? null : line.rateListPrice,
        discount: hasVariants ? 0 : line.discount,
        wholesalePrice: hasVariants ? null : line.wholesalePrice,
        retailPrice: hasVariants ? null : line.retailPrice,
        notes: line.notes,
        variants: hasVariants
          ? product.variants.map((v) => ({
              variantId: v.id,
              rate: line.variantPrices[v.id]?.rateListPrice ?? null,
              discount: line.variantPrices[v.id]?.discount ?? 0,
              wholesalePrice: line.variantPrices[v.id]?.wholesalePrice ?? null,
              retailPrice: line.variantPrices[v.id]?.retailPrice ?? null,
            }))
          : [],
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
        toast.error(data.error || "Failed to save the rate list.");
        setSaving(false);
        return;
      }

      setNotice(
        `Rate list saved: ${data.created ?? 0} created, ${
          data.updated ?? 0
        } updated, ${data.deleted ?? 0} removed.`
      );
      toast.success(
        `Rate list saved: ${data.created ?? 0} created, ${
          data.updated ?? 0
        } updated, ${data.deleted ?? 0} removed.`
      );
    } catch (e) {
      console.error("Failed to save rate list:", e);
      setNotice("Network error while saving the rate list.");
      toast.error("Network error while saving the rate list.");
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) {
      toast.error("Select a supplier first.");
      return;
    }

    const rows: Record<string, string>[] = [];
    for (const product of gridProducts) {
      const line = getLine(product.id);
      const hasVariants = product.variants.length > 0;

      if (hasVariants) {
        for (const v of product.variants) {
          const vp = line.variantPrices[v.id] ?? { rateListPrice: null, discount: 0, wholesalePrice: null, retailPrice: null };
          rows.push({
            productName: product.name,
            productCode: product.code,
            unit: product.unit,
            category: product.categoryName ?? "",
            variantName: v.name,
            variantSku: v.sku,
            sizeValue: String(v.sizeValue),
            sizeUnit: v.sizeUnit,
            rateListPrice: String(vp.rateListPrice ?? ""),
            discount: String(vp.discount || ""),
            wholesalePrice: String(vp.wholesalePrice ?? ""),
            retailPrice: String(vp.retailPrice ?? ""),
          });
        }
      } else {
        rows.push({
          productName: product.name,
          productCode: product.code,
          unit: product.unit,
          category: product.categoryName ?? "",
          variantName: "",
          variantSku: "",
          sizeValue: "",
          sizeUnit: "",
          rateListPrice: String(line.rateListPrice ?? ""),
          discount: String(line.discount || ""),
          wholesalePrice: String(line.wholesalePrice ?? ""),
          retailPrice: String(line.retailPrice ?? ""),
        });
      }
    }

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rate-list-${supplier.name.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} rows to CSV.`);
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
    setNotice("");
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
        toast.error(data.error || "Failed to deactivate supplier.");
        return;
      }

      await fetchInitial();
    } catch (e) {
      console.error("Failed to deactivate supplier:", e);
      setNotice("Failed to deactivate supplier.");
      toast.error("Failed to deactivate supplier.");
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
      toast.error("Trade name cannot be empty.");
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
        toast.error(data.error || "Failed to create trade.");
        return;
      }
      setAddingTrade(false);
      setNewTradeName("");
      setNotice(`Trade "${trimmed}" created.`);
      toast.success(`Trade "${trimmed}" created.`);
      await fetchInitial();
    } catch (e) {
      console.error("Failed to create trade:", e);
      setNotice("Failed to create trade.");
      toast.error("Failed to create trade.");
    } finally {
      setSaving(false);
    }
  }

  async function createCategory(tradeId: string) {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setNotice("Category name cannot be empty.");
      toast.error("Category name cannot be empty.");
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
        toast.error(data.error || "Failed to create category.");
        return;
      }
      setAddCategoryTradeId("");
      setNewCategoryName("");
      setNotice(`Category "${trimmed}" created.`);
      toast.success(`Category "${trimmed}" created.`);
      await fetchInitial();
    } catch (e) {
      console.error("Failed to create category:", e);
      setNotice("Failed to create category.");
      toast.error("Failed to create category.");
    } finally {
      setSaving(false);
    }
  }

  function generateProductCode(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);
    if (!slug) return "";
    const rand = Math.random().toString(36).slice(2, 6);
    return `${slug}-${rand}`;
  }

  function generateSku(productCode: string, index: number): string {
    return `${productCode}-V${index + 1}`;
  }

  function openAddProduct(categoryId: string) {
    setProductDialogMode("add");
    setProductDialogCategoryId(categoryId);
    setProductForm({
      id: "", name: "", code: "", description: "", unit: "PIECE",
      barcode: "", categoryId, imageUrl: "", isFeatured: false, status: "ACTIVE",
    });
    setProductVariants([]);
  }

  async function openEditProduct(product: TreeProduct) {
    setProductDialogMode("edit");
    setProductDialogCategoryId(product.categoryId ?? "");
    setProductForm({
      id: product.id, name: product.name, code: product.code,
      description: "", unit: product.unit, barcode: product.barcode ?? "",
      categoryId: product.categoryId ?? "", imageUrl: "",
      isFeatured: product.isFeatured, status: product.status,
    });
    setProductVariants([]);
    try {
      const res = await fetch(`/api/products/${product.id}`);
      const data = await res.json();
      if (res.ok) {
        setProductForm((f) => ({
          ...f,
          description: data.description ?? "",
          imageUrl: data.imageUrl ?? "",
          barcode: data.barcode ?? "",
        }));
        if (Array.isArray(data.variants)) {
          setProductVariants(data.variants.map((v: { id: string; name: string; sizeValue: string; sizeUnit: string; sku?: string; imageUrl?: string | null }) => ({
            id: v.id, name: v.name, sizeValue: String(v.sizeValue), sizeUnit: v.sizeUnit, sku: v.sku, imageUrl: v.imageUrl ?? "",
          })));
        }
      }
    } catch {
      toast.error("Failed to load product details.");
    }
  }

  function addVariantRow() {
    setProductVariants((prev) => [
      ...prev,
      { id: `__new_${Date.now()}_${prev.length}`, name: "", sizeValue: "", sizeUnit: productForm.unit },
    ]);
  }

  function updateVariantRow(id: string, patch: Partial<typeof productVariants[number]>) {
    setProductVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  function removeVariantRow(id: string) {
    setProductVariants((prev) => prev.filter((v) => v.id !== id));
  }

  function uploadImage(field: string, purpose: string, callback: (url: string) => void) {
    const inputKey = field;
    const input = field === "product"
      ? productImageInput.current
      : variantImageInputs.current.get(field);

    const file = input?.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", purpose);

    setUploadingField(inputKey);

    fetch("/api/upload", { method: "POST", body: formData })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed.");
        callback(data.url as string);
        setNotice("Image uploaded — save to keep changes.");
      })
      .catch((e) => setNotice(e.message || "Upload failed."))
      .finally(() => {
        setUploadingField(null);
        if (input) input.value = "";
      });
  }

  function moveVariant(id: string, direction: "up" | "down") {
    setProductVariants((prev) => {
      const idx = prev.findIndex((v) => v.id === id);
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
  }

  async function saveProductDialog() {
    const { name, unit, categoryId } = productForm;
    if (!name.trim()) {
      toast.error("Product name is required.");
      return;
    }
    setSaving(true);
    try {
      const isEdit = productDialogMode === "edit" && productForm.id;
      const code = productForm.code.trim() || generateProductCode(name);

      const existingSkus = productVariants
        .filter((v) => !v.id.startsWith("__new_") && v.sku)
        .map((v) => v.sku!);
      const maxExistingIndex = existingSkus.reduce((max, sku) => {
        const match = sku.match(/-V(\d+)$/i);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      let newIndex = maxExistingIndex;

      const variantsPayload = productVariants
        .filter((v) => v.name.trim())
        .map((v) => {
          const isNew = v.id.startsWith("__new_");
          if (isNew) newIndex++;
          return {
            id: isNew ? undefined : v.id,
            name: v.name.trim(),
            sku: isNew ? generateSku(code, newIndex - 1) : (v.sku || generateSku(code, 0)),
            sizeValue: v.sizeValue.trim() || "1",
            sizeUnit: v.sizeUnit,
            imageUrl: v.imageUrl?.trim() || null,
          };
        });

      if (isEdit) {
        const res = await fetch(`/api/products/${productForm.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            code,
            description: productForm.description.trim() || null,
            unit,
            barcode: productForm.barcode.trim() || null,
            categoryId: categoryId || null,
            imageUrl: productForm.imageUrl.trim() || null,
            isFeatured: productForm.isFeatured,
            status: productForm.status,
            variants: variantsPayload,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Failed to update product.");
          return;
        }
        toast.success("Product updated.");
      } else {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            name: name.trim(),
            unit,
            categoryId: categoryId || null,
            status: productForm.status,
            description: productForm.description.trim() || null,
            imageUrl: productForm.imageUrl.trim() || null,
            isFeatured: productForm.isFeatured,
            variants: variantsPayload,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Failed to create product.");
          return;
        }
        toast.success(`Product "${name.trim()}" created.`);
      }
      setProductDialogMode(null);
      await fetchInitial();
    } catch (err) {
      console.error("Save product error:", err);
      toast.error("Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  async function duplicateProduct(product: TreeProduct) {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${product.id}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load product.");
        return;
      }

      const original = data;

      setProductDialogMode("add");
      setProductDialogCategoryId(product.categoryId ?? "");
      setProductForm({
        id: "",
        name: product.name + " (copy)",
        code: "",
        description: original.description ?? "",
        unit: product.unit,
        barcode: "",
        categoryId: product.categoryId ?? "",
        imageUrl: original.imageUrl ?? "",
        isFeatured: product.isFeatured,
        status: "ACTIVE",
      });

      if (Array.isArray(original.variants)) {
        setProductVariants(
          original.variants.map((v: { id: string; name: string; sizeValue: number; sizeUnit: string }) => ({
            id: `__new_${Date.now()}_${Math.random()}`,
            name: v.name,
            sizeValue: String(v.sizeValue),
            sizeUnit: v.sizeUnit,
          }))
        );
      } else {
        setProductVariants([]);
      }

      toast.info("Review the duplicated product and save.");
    } catch {
      toast.error("Failed to duplicate product.");
    } finally {
      setSaving(false);
    }
  }

  async function duplicateCategory(category: Category) {
    const catsInTrade = products.filter((p) => p.categoryId === category.id);
    if (catsInTrade.length === 0) {
      toast.error("Category has no products to copy.");
      return;
    }

    setSaving(true);
    try {
      const copyName = category.name + " (copy)";
      const catRes = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: copyName,
          group: category.group ?? "General",
          tradeId: category.tradeId,
        }),
      });
      const catData = await catRes.json();
      if (!catRes.ok) {
        toast.error(catData.error || "Failed to create category.");
        return;
      }

      toast.success(`Category "${copyName}" created. Add products via the + button.`);
      await fetchInitial();
    } catch {
      toast.error("Failed to duplicate category.");
    } finally {
      setSaving(false);
    }
  }

  async function saveTrade(tradeId: string) {
    const trimmed = editingTradeName.trim();
    if (!trimmed) {
      setNotice("Trade name cannot be empty.");
      toast.error("Trade name cannot be empty.");
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
        toast.error(data.error || "Failed to update trade.");
        return;
      }
      setEditingTradeId("");
      setEditingTradeName("");
      setNotice(`Trade renamed to "${trimmed}".`);
      toast.success(`Trade renamed to "${trimmed}".`);
      await fetchInitial();
    } catch (e) {
      console.error("Failed to update trade:", e);
      setNotice("Failed to update trade.");
      toast.error("Failed to update trade.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTradeActive(trade: Trade) {
    setSaving(true);
    try {
      const response = await fetch(`/api/trades/${trade.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !trade.isActive }),
      });
      const data = await response.json();
      if (!response.ok) {
        setNotice(data.error || "Failed to toggle trade status.");
        toast.error(data.error || "Failed to toggle trade status.");
        return;
      }
      setNotice(`Trade "${trade.name}" ${trade.isActive ? "deactivated" : "activated"}.`);
      toast.success(`Trade "${trade.name}" ${trade.isActive ? "deactivated" : "activated"}.`);
      await fetchInitial();
    } catch (e) {
      console.error("Failed to toggle trade status:", e);
      setNotice("Failed to toggle trade status.");
      toast.error("Failed to toggle trade status.");
    } finally {
      setSaving(false);
    }
  }

  async function createPurchaseOrder() {
    if (!catalogSupplierId) {
      setNotice("Expand a supplier first to create a purchase order.");
      toast.error("Expand a supplier first to create a purchase order.");
      return;
    }

    const selectedItems = selectedProducts().filter((p) => {
      const reorder = p.reorderLevel;
      return reorder != null && reorder > p.stockQuantity;
    });

    if (selectedItems.length === 0) {
      setNotice("No selected products need reordering (reorder level not exceeded).");
      toast.error("No selected products need reordering (reorder level not exceeded).");
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
        toast.error(data.error || "Failed to create purchase order.");
        return;
      }
      setNotice(`Purchase order ${poNumber} created with ${items.length} item(s).`);
      toast.success(`Purchase order ${poNumber} created with ${items.length} item(s).`);
    } catch (e) {
      console.error("Failed to create purchase order:", e);
      setNotice("Failed to create purchase order.");
      toast.error("Failed to create purchase order.");
    } finally {
      setSaving(false);
    }
  }

  function printSelectedBarcodes() {
    const items = selectedProducts().filter((p) => p.barcode);
    if (items.length === 0) {
      setNotice("No selected products have barcodes.");
      toast.error("No selected products have barcodes.");
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
      toast.error("No products selected.");
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
    toast.success(`PDF generated with ${items.length} item(s).`);
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
            variant={advancedMode ? "default" : "outline"}
            size="sm"
            onClick={() => setAdvancedMode((prev) => !prev)}
          >
            <Settings2 className="mr-1 h-3 w-3" />
            Advanced
          </Button>
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

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <TradeSkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Sticky action bar removed — grid has its own toolbar */}

      <div className="space-y-4">
        {trades
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((trade) => {
            const derivedTradeSuppliers = suppliers.filter((s) =>
              s.tradeIds.includes(trade.id)
            );
            const manualIds = manualTradeSuppliers[trade.id] ?? [];
            const manualOnly = manualIds
              .filter((id) => !derivedTradeSuppliers.some((s) => s.id === id))
              .map((id) => suppliers.find((s) => s.id === id))
              .filter((s): s is Supplier => !!s);
            const tradeSuppliers = [...derivedTradeSuppliers, ...manualOnly];
            const tradeProductsCount = products.filter((p) => {
              const cat = categories.find((c) => c.id === p.categoryId);
              return cat?.tradeId === trade.id;
            }).length;

            return (
              <Card key={trade.id} className={!trade.isActive ? "opacity-50" : ""}>
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
                          <CardTitle
                            className="text-sm cursor-pointer hover:underline"
                            onDoubleClick={() => startEditTrade(trade)}
                          >
                            {trade.name}
                          </CardTitle>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => startEditTrade(trade)}
                            title="Edit trade name"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          {!trade.isActive && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
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
                          onClick={() => void toggleTradeActive(trade)}
                        >
                          <PowerOff className="mr-1 h-3 w-3" />
                          {trade.isActive ? "Deactivate" : "Activate"}
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

                  {(addingForTradeId === trade.id ||
                    addingForTradeId === trade.id + "-new") && (
                    <div className="space-y-2 rounded-md border border-dashed p-3">
                      <Label className="text-xs text-muted-foreground">
                        Add supplier to {trade.name}
                      </Label>
                      {(() => {
                        const tradeSupplierIds = new Set(tradeSuppliers.map((s) => s.id));
                        const availableSuppliers = suppliers.filter(
                          (s) => s.isActive && !tradeSupplierIds.has(s.id)
                        );
                        return availableSuppliers.length > 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <select
                                value=""
                                onChange={(e) => {
                                  const id = e.target.value;
                                  if (id) {
                                    setSupplierId(id);
                                    setCatalogSupplierId(id);
                                    setAddingForTradeId("");
                                    setManualTradeSuppliers((prev) => ({
                                      ...prev,
                                      [trade.id]: [...(prev[trade.id] ?? []).filter((x) => x !== id), id],
                                    }));
                                  }
                                }}
                                className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
                              >
                                <option value="">Select existing supplier...</option>
                                {availableSuppliers.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-px flex-1 bg-muted" />
                              <span className="text-[10px] text-muted-foreground">or</span>
                              <div className="h-px flex-1 bg-muted" />
                            </div>
                          </div>
                        ) : null;
                      })()}
                      {addingForTradeId === trade.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setAddingForTradeId(trade.id + "-new")}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add New Supplier
                        </Button>
                      )}
                      {addingForTradeId === trade.id + "-new" && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Name *</Label>
                              <Input
                                autoFocus
                                value={newSupplierForm.name}
                                onChange={(e) => setNewSupplierForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="Supplier name"
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Contact Person</Label>
                              <Input
                                value={newSupplierForm.contactName}
                                onChange={(e) => setNewSupplierForm((f) => ({ ...f, contactName: e.target.value }))}
                                placeholder="Contact name"
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Phone</Label>
                              <Input
                                value={newSupplierForm.phone}
                                onChange={(e) => setNewSupplierForm((f) => ({ ...f, phone: e.target.value }))}
                                placeholder="Phone"
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Email</Label>
                              <Input
                                value={newSupplierForm.email}
                                onChange={(e) => setNewSupplierForm((f) => ({ ...f, email: e.target.value }))}
                                placeholder="Email"
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Address</Label>
                            <Input
                              value={newSupplierForm.address}
                              onChange={(e) => setNewSupplierForm((f) => ({ ...f, address: e.target.value }))}
                              placeholder="Address"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              disabled={saving || !newSupplierForm.name.trim()}
                              onClick={async () => {
                                if (!newSupplierForm.name.trim()) return;
                                setSaving(true);
                                try {
                                  const res = await fetch("/api/suppliers", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      name: newSupplierForm.name.trim(),
                                      contactName: newSupplierForm.contactName.trim() || null,
                                      phone: newSupplierForm.phone.trim() || null,
                                      email: newSupplierForm.email.trim() || null,
                                      address: newSupplierForm.address.trim() || null,
                                    }),
                                  });
                                  const data = await res.json();
                                  if (!res.ok) {
                                    toast.error(data.error || "Failed to create supplier.");
                                    return;
                                  }
                                   toast.success(`Created "${newSupplierForm.name.trim()}".`);
                                   setAddingForTradeId("");
                                   setNewSupplierForm({ name: "", contactName: "", phone: "", email: "", address: "" });
                                   await fetchInitial();
                                   if (data.id) {
                                     setSupplierId(data.id);
                                     setCatalogSupplierId(data.id);
                                     setManualTradeSuppliers((prev) => ({
                                       ...prev,
                                       [trade.id]: [...(prev[trade.id] ?? []).filter((x) => x !== data.id), data.id],
                                     }));
                                   }
                                } catch {
                                  toast.error("Failed to create supplier.");
                                } finally {
                                  setSaving(false);
                                }
                              }}
                            >
                              {saving ? "Creating..." : "Create & Select"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setAddingForTradeId(trade.id);
                                setNewSupplierForm({ name: "", contactName: "", phone: "", email: "", address: "" });
                              }}
                            >
                              Back
                            </Button>
                          </div>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setAddingForTradeId("")}
                      >
                        Cancel
                      </Button>
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
                        <div className="border-t divide-y">
                          {advancedMode && (supplier.contactName || supplier.phone || supplier.email || supplier.address || supplier.notes) && (
                            <div className="px-3 py-2 text-xs space-y-1 bg-muted/30">
                              {supplier.contactName && <p><span className="text-muted-foreground">Contact:</span> {supplier.contactName}</p>}
                              {supplier.phone && <p><span className="text-muted-foreground">Phone:</span> {supplier.phone}</p>}
                              {supplier.email && <p><span className="text-muted-foreground">Email:</span> {supplier.email}</p>}
                              {supplier.address && <p><span className="text-muted-foreground">Address:</span> {supplier.address}</p>}
                              {supplier.notes && <p><span className="text-muted-foreground">Notes:</span> {supplier.notes}</p>}
                            </div>
                          )}

                          {/* Toolbar */}
                          <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-muted/20">
                            <Input
                              placeholder="Search products..."
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              className="h-8 text-xs max-w-[200px]"
                            />
                            <Badge variant="secondary" className="tabular-nums text-[10px]">
                              {gridProducts.length} products
                            </Badge>
                            <div className="flex-1" />
                            <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={exportCsv}>
                              <Download className="mr-1 h-3 w-3" />
                              Export CSV
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setShowImport(true)}>
                              <Upload className="mr-1 h-3 w-3" />
                              Import CSV
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-[11px]"
                              disabled={saving || selectedCount === 0}
                              onClick={saveRateList}
                            >
                              <Save className="mr-1 h-3 w-3" />
                              {saving ? "Saving…" : `Save (${selectedCount})`}
                            </Button>
                          </div>

                          {/* Spreadsheet Grid */}
                          {loadingLines ? (
                            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                              <Loader2 className="mx-auto h-4 w-4 animate-spin mb-2" />
                              Loading rate list…
                            </div>
                          ) : gridProducts.length === 0 ? (
                            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                              No products match your search.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-[11px] border-collapse min-w-[700px]">
                                <thead className="sticky top-0 z-10">
                                  <tr className="border-b bg-muted/60">
                                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground min-w-[180px]">Product</th>
                                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-24">Code</th>
                                    {advancedMode && <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-24">Brand</th>}
                                    <th className="px-2 py-1.5 text-right font-medium text-muted-foreground w-20">List Price</th>
                                    <th className="px-2 py-1.5 text-right font-medium text-muted-foreground w-16">Disc %</th>
                                    <th className="px-2 py-1.5 text-right font-medium text-muted-foreground w-20">Purchase</th>
                                    {advancedMode && <th className="px-2 py-1.5 text-right font-medium text-muted-foreground w-20">Wholesale</th>}
                                    {advancedMode && <th className="px-2 py-1.5 text-right font-medium text-muted-foreground w-20">Retail</th>}
                                    <th className="px-2 py-1.5 w-8" />
                                  </tr>
                                </thead>
                                <tbody>
                                  {gridCategories.map((category) => {
                                    const catProducts = gridProducts.filter((p) => p.categoryId === category.id);
                                    return (
                                      <Fragment key={category.id}>
                                        <tr>
                                          <td
                                            colSpan={advancedMode ? 9 : 7}
                                            className="px-2 py-1 bg-muted/40 font-semibold text-[11px] border-t border-b"
                                          >
                                            <div className="flex items-center justify-between">
                                              <span>{category.name}</span>
                                              <div className="flex items-center gap-1">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-5 px-1.5 text-[9px]"
                                                  onClick={() => void duplicateCategory(category)}
                                                >
                                                  <Copy className="mr-0.5 h-2.5 w-2.5" />Copy
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-5 px-1.5 text-[9px]"
                                                  onClick={() => openAddProduct(category.id)}
                                                >
                                                  <Plus className="mr-0.5 h-2.5 w-2.5" />Add
                                                </Button>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                        {catProducts.map((product) => {
                                          const line = getLine(product.id);
                                          const hasVariants = product.variants.length > 0;
                                          return (
                                            <Fragment key={product.id}>
                                              <tr className="border-b hover:bg-muted/20 group">
                                                <td className="px-2 py-1">
                                                  <div className="flex items-center gap-1.5">
                                                    <button
                                                      type="button"
                                                      className="text-muted-foreground hover:text-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                      onClick={() => void openEditProduct(product)}
                                                      title="Edit product"
                                                    >
                                                      <Pencil className="h-3 w-3" />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      className="text-muted-foreground hover:text-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                      onClick={() => void duplicateProduct(product)}
                                                      title="Duplicate product"
                                                    >
                                                      <Copy className="h-3 w-3" />
                                                    </button>
                                                    <span className="truncate font-medium">{product.name}</span>
                                                    {product.variants.length > 0 && (
                                                      <Badge variant="outline" className="text-[9px] shrink-0 py-0">
                                                        {product.variants.length}v
                                                      </Badge>
                                                    )}
                                                  </div>
                                                </td>
                                                <td className="px-2 py-1 font-mono text-muted-foreground">{product.code}</td>
                                                {advancedMode && (
                                                  <td className="px-2 py-1">
                                                    <select
                                                      value={line.brandId ?? "generic"}
                                                      onChange={(e) => {
                                                        setLine(product.id, { brandId: e.target.value === "generic" ? null : e.target.value });
                                                        setSelected((prev) => new Set([...prev, product.id]));
                                                      }}
                                                      className="w-full rounded border bg-background px-1 py-0.5 text-[11px]"
                                                    >
                                                      <option value="generic">Generic</option>
                                                      {brands.filter((b) => !b.inCategory || b.categoryId === product.categoryId).map((brand) => (
                                                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                                                      ))}
                                                    </select>
                                                  </td>
                                                )}
                                                <td className="px-1 py-0.5">
                                                  <input
                                                    type="number"
                                                    value={line.rateListPrice ?? ""}
                                                    onChange={(e) => {
                                                      setLine(product.id, { rateListPrice: toDecimalOrNull(e.target.value) });
                                                      setSelected((prev) => new Set([...prev, product.id]));
                                                    }}
                                                    placeholder="—"
                                                    className="w-full text-right rounded border bg-background px-1 py-0.5 text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                  />
                                                </td>
                                                <td className="px-1 py-0.5">
                                                  <input
                                                    type="number"
                                                    value={line.discount || ""}
                                                    onChange={(e) => {
                                                      setLine(product.id, { discount: toDecimalOrZero(e.target.value) });
                                                      setSelected((prev) => new Set([...prev, product.id]));
                                                    }}
                                                    placeholder="0"
                                                    className="w-full text-right rounded border bg-background px-1 py-0.5 text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                  />
                                                </td>
                                                <td className="px-2 py-1 text-right tabular-nums text-muted-foreground bg-muted/20">
                                                  {line.rateListPrice != null && line.discount != null
                                                    ? Math.round(line.rateListPrice * (1 - line.discount / 100) * 100) / 100
                                                    : ""}
                                                </td>
                                                {advancedMode && (
                                                  <td className="px-1 py-0.5">
                                                    <input
                                                      type="number"
                                                      value={line.wholesalePrice ?? ""}
                                                      onChange={(e) => {
                                                        setLine(product.id, { wholesalePrice: toDecimalOrNull(e.target.value) });
                                                        setSelected((prev) => new Set([...prev, product.id]));
                                                      }}
                                                      placeholder="—"
                                                      className="w-full text-right rounded border bg-background px-1 py-0.5 text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                    />
                                                  </td>
                                                )}
                                                {advancedMode && (
                                                  <td className="px-1 py-0.5">
                                                    <input
                                                      type="number"
                                                      value={line.retailPrice ?? ""}
                                                      onChange={(e) => {
                                                        setLine(product.id, { retailPrice: toDecimalOrNull(e.target.value) });
                                                        setSelected((prev) => new Set([...prev, product.id]));
                                                      }}
                                                      placeholder="—"
                                                      className="w-full text-right rounded border bg-background px-1 py-0.5 text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                    />
                                                  </td>
                                                )}
                                                <td className="px-1 py-0.5 text-center">
                                                  {hasVariants && (
                                                    <button
                                                      type="button"
                                                      onClick={() => toggleVariantPricing(product.id)}
                                                      className="text-muted-foreground hover:text-foreground"
                                                      title={`${product.variants.length} variant(s)`}
                                                    >
                                                      {expandedVariantPricing.has(product.id) ? (
                                                        <ChevronDown className="h-3 w-3" />
                                                      ) : (
                                                        <ChevronRight className="h-3 w-3" />
                                                      )}
                                                    </button>
                                                  )}
                                                </td>
                                              </tr>

                                              {hasVariants && expandedVariantPricing.has(product.id) && product.variants.map((v) => {
                                                const vp = line.variantPrices[v.id] ?? { rateListPrice: null, discount: 0, wholesalePrice: null, retailPrice: null };
                                                return (
                                                  <tr key={v.id} className="border-b bg-muted/10 hover:bg-muted/20">
                                                    <td className="px-2 py-1 pl-8">
                                                      <span className="text-muted-foreground">{v.name}</span>
                                                    </td>
                                                    <td className="px-2 py-1 font-mono text-muted-foreground text-[10px]">{v.sku}</td>
                                                    {advancedMode && <td />}
                                                    <td className="px-1 py-0.5">
                                                      <input
                                                        type="number"
                                                        value={vp.rateListPrice ?? ""}
                                                        onChange={(e) => {
                                                          setVariantPrice(product.id, v.id, { rateListPrice: toDecimalOrNull(e.target.value) });
                                                          setSelected((prev) => new Set([...prev, product.id]));
                                                        }}
                                                        placeholder="—"
                                                        className="w-full text-right rounded border bg-background px-1 py-0.5 text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                      />
                                                    </td>
                                                    <td className="px-1 py-0.5">
                                                      <input
                                                        type="number"
                                                        value={vp.discount || ""}
                                                        onChange={(e) => {
                                                          setVariantPrice(product.id, v.id, { discount: toDecimalOrZero(e.target.value) });
                                                          setSelected((prev) => new Set([...prev, product.id]));
                                                        }}
                                                        placeholder="0"
                                                        className="w-full text-right rounded border bg-background px-1 py-0.5 text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                      />
                                                    </td>
                                                    <td className="px-2 py-1 text-right tabular-nums text-muted-foreground bg-muted/20">
                                                      {vp.rateListPrice != null && vp.discount != null
                                                        ? Math.round(vp.rateListPrice * (1 - vp.discount / 100) * 100) / 100
                                                        : ""}
                                                    </td>
                                                    {advancedMode && (
                                                      <td className="px-1 py-0.5">
                                                        <input
                                                          type="number"
                                                          value={vp.wholesalePrice ?? ""}
                                                          onChange={(e) => {
                                                            setVariantPrice(product.id, v.id, { wholesalePrice: toDecimalOrNull(e.target.value) });
                                                            setSelected((prev) => new Set([...prev, product.id]));
                                                          }}
                                                          placeholder="—"
                                                          className="w-full text-right rounded border bg-background px-1 py-0.5 text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                        />
                                                      </td>
                                                    )}
                                                    {advancedMode && (
                                                      <td className="px-1 py-0.5">
                                                        <input
                                                          type="number"
                                                          value={vp.retailPrice ?? ""}
                                                          onChange={(e) => {
                                                            setVariantPrice(product.id, v.id, { retailPrice: toDecimalOrNull(e.target.value) });
                                                            setSelected((prev) => new Set([...prev, product.id]));
                                                          }}
                                                          placeholder="—"
                                                          className="w-full text-right rounded border bg-background px-1 py-0.5 text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                        />
                                                      </td>
                                                    )}
                                                    <td />
                                                  </tr>
                                                );
                                              })}
                                            </Fragment>
                                          );
                                        })}
                                      </Fragment>
                                    );
                                  })}
                                </tbody>
                              </table>
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

      <Dialog open={!!productDialogMode} onOpenChange={(open) => { if (!open) setProductDialogMode(null); }}>
        <DialogContent className="fixed inset-0 z-50 m-0 h-full w-full max-w-full rounded-none border-0 p-0 gap-0 overflow-hidden flex flex-col sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:m-4 sm:max-w-[calc(100%-2rem)] md:max-w-3xl lg:max-w-5xl sm:max-h-[92vh]">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="text-base sm:text-lg">
              {productDialogMode === "add"
                ? `Add Product to ${categories.find((c) => c.id === productDialogCategoryId)?.name ?? ""}`
                : "Edit Product"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto min-h-0">
            <div className="grid grid-cols-1 divide-y sm:divide-y-0 lg:grid-cols-5 lg:divide-x min-h-full">
              {/* LEFT: Product Details — 3 cols */}
              <div className="lg:col-span-3 p-4 sm:p-5 space-y-3 sm:space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product Details</h3>

                <div className="space-y-1.5">
                  <Label className="text-xs">Name *</Label>
                  <Input
                    autoFocus
                    value={productForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setProductForm((f) => ({
                        ...f,
                        name,
                        code: productDialogMode === "add" ? generateProductCode(name) : f.code,
                      }));
                    }}
                    placeholder="e.g. PPC Cement 42.5"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Code</Label>
                  <Input
                    value={productForm.code}
                    onChange={(e) => setProductForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="Auto-generated from name"
                    className="h-9 font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">Auto-generated from product name. You can edit it.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Optional product description"
                    className="min-h-[60px] text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Unit</Label>
                    <Select value={productForm.unit} onValueChange={(v) => setProductForm((f) => ({ ...f, unit: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRODUCT_UNITS.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select value={productForm.status} onValueChange={(v) => setProductForm((f) => ({ ...f, status: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <Select value={productForm.categoryId} onValueChange={(v) => setProductForm((f) => ({ ...f, categoryId: v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Product Image</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      disabled={uploadingField === "product"}
                      onClick={() => productImageInput.current?.click()}
                    >
                      <Upload className="mr-1 h-3 w-3" />
                      {uploadingField === "product" ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                  <input
                    ref={productImageInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={() => uploadImage("product", "product", (url) => setProductForm((f) => ({ ...f, imageUrl: url })))}
                  />
                  <div className="flex items-center gap-2">
                    {productForm.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={productForm.imageUrl}
                        alt="Product"
                        className="h-10 w-10 rounded border object-cover bg-muted shrink-0"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded border bg-muted shrink-0">
                        <ImagePlus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <Input
                      value={productForm.imageUrl}
                      onChange={(e) => setProductForm((f) => ({ ...f, imageUrl: e.target.value }))}
                      placeholder="https://..."
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.isFeatured}
                    onChange={(e) => setProductForm((f) => ({ ...f, isFeatured: e.target.checked }))}
                    className="h-4 w-4 rounded border-input accent-amber-600"
                  />
                  Featured product
                </label>
              </div>

              {/* RIGHT: Variants — 2 cols */}
              <div className="lg:col-span-2 p-4 sm:p-5 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Variants</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Optional — SKU auto-generated</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-[11px] shrink-0" onClick={addVariantRow}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                </div>

                {productVariants.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-lg">
                    <p className="text-xs text-muted-foreground">No variants yet</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Product sold as a single unit</p>
                  </div>
                )}

                <div className="space-y-2 max-h-[45vh] overflow-auto pr-1">
                  {productVariants.map((v, i) => (
                    <div key={v.id} className="rounded-lg border bg-background p-3 space-y-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <GripVertical className="h-3 w-3 text-muted-foreground/50" />
                          <span className="text-[10px] font-medium text-muted-foreground">
                            #{i + 1} · {v.name || "Unnamed"}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                            disabled={i === 0}
                            onClick={() => moveVariant(v.id, "up")}
                            title="Move up"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                            disabled={i === productVariants.length - 1}
                            onClick={() => moveVariant(v.id, "down")}
                            title="Move down"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeVariantRow(v.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Input
                        placeholder="Name (e.g. 50 kg bag)"
                        value={v.name}
                        onChange={(e) => updateVariantRow(v.id, { name: e.target.value })}
                        className="h-8 text-xs"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Size"
                          value={v.sizeValue}
                          onChange={(e) => updateVariantRow(v.id, { sizeValue: e.target.value })}
                          className="h-8 text-xs"
                        />
                        <Select value={v.sizeUnit} onValueChange={(val) => updateVariantRow(v.id, { sizeUnit: val })}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRODUCT_UNITS.map((u) => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">Variant Image</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-1.5"
                            disabled={uploadingField === v.id}
                            onClick={() => variantImageInputs.current.get(v.id)?.click()}
                          >
                            <Upload className="mr-1 h-2.5 w-2.5" />
                            {uploadingField === v.id ? "Uploading..." : "Upload"}
                          </Button>
                        </div>
                        <input
                          ref={(el) => { if (el) variantImageInputs.current.set(v.id, el); }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={() => uploadImage(v.id, "product", (url) => updateVariantRow(v.id, { imageUrl: url }))}
                        />
                        <div className="flex items-center gap-1.5">
                          {v.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={v.imageUrl}
                              alt="Variant"
                              className="h-7 w-7 rounded border object-cover bg-muted shrink-0"
                            />
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded border bg-muted shrink-0">
                              <ImagePlus className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                          <Input
                            placeholder="Image URL"
                            value={v.imageUrl ?? ""}
                            onChange={(e) => updateVariantRow(v.id, { imageUrl: e.target.value })}
                            className="h-7 text-[10px]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-4 sm:px-6 py-3 border-t bg-background shrink-0">
            <Button variant="outline" size="sm" onClick={() => setProductDialogMode(null)}>
              Cancel
            </Button>
            <Button size="sm" className="min-w-[120px]" disabled={saving} onClick={() => void saveProductDialog()}>
              {saving ? "Saving..." : productDialogMode === "add" ? "Create Product" : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showImport} onOpenChange={(open) => { if (!open) { setShowImport(false); setImportFile(null); setImportPreview([]); setImportResults({ success: 0, errors: [] }); } }}>
        <DialogContent className="fixed inset-0 z-50 m-0 h-full w-full max-w-full rounded-none border-0 p-0 gap-0 overflow-hidden flex flex-col sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:m-4 sm:max-w-xl sm:max-h-[90vh]">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="text-base sm:text-lg">Import Products from CSV</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-0 p-4 sm:p-6 space-y-4">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Columns: <span className="font-mono">name, code, unit, category, brand, rateListPrice, discount, retailPrice, wholesalePrice</span>
            </p>

            {/* Styled file input */}
            <label className="flex flex-col items-center justify-center w-full h-24 sm:h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center gap-1">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {importFile ? importFile.name : "Click to select CSV file"}
                </span>
              </div>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImportFile(file);
                    Papa.parse(file, {
                      header: true,
                      skipEmptyLines: true,
                      complete: (results) => {
                        setImportPreview(results.data.slice(0, 5) as Record<string, string>[]);
                      },
                    });
                  }
                }}
              />
            </label>

            {importPreview.length > 0 && (
              <div className="rounded border">
                <p className="px-2 py-1 text-[10px] text-muted-foreground bg-muted/50 border-b">
                  Preview (first {importPreview.length} rows)
                </p>
                <div className="overflow-x-auto max-h-40">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        {Object.keys(importPreview[0]).map((key) => (
                          <th key={key} className="px-2 py-1 text-left font-medium whitespace-nowrap">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="px-2 py-1 whitespace-nowrap">{String(val ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing... {importResults.success} created, {importResults.errors.length} errors
              </div>
            )}

            {importResults.errors.length > 0 && !importing && (
              <div className="max-h-32 overflow-y-auto space-y-1 rounded border border-destructive/30 bg-destructive/5 p-2">
                {importResults.errors.map((err, i) => (
                  <p key={i} className="text-[11px] text-destructive">{err}</p>
                ))}
              </div>
            )}

            {importResults.success > 0 && !importing && (
              <p className="text-xs text-green-600 font-medium">
                Successfully imported {importResults.success} products.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-4 sm:px-6 py-3 border-t bg-background shrink-0">
            <Button variant="outline" size="sm" onClick={() => { setShowImport(false); setImportFile(null); setImportPreview([]); setImportResults({ success: 0, errors: [] }); }}>
              {importResults.success > 0 ? "Done" : "Cancel"}
            </Button>
            <Button
              size="sm"
              disabled={!importFile || importing}
              onClick={async () => {
                if (!importFile) return;
                setImporting(true);
                setImportResults({ success: 0, errors: [] });
                try {
                  const parsed = await new Promise<Papa.ParseResult<Record<string, string>>>((resolve, reject) => {
                    Papa.parse(importFile, {
                      header: true,
                      skipEmptyLines: true,
                      complete: resolve,
                      error: reject,
                    });
                  });

                  let success = 0;
                  const errors: string[] = [];
                  const createdProducts: Array<{ id: string; row: Record<string, string> }> = [];

                  for (const row of parsed.data) {
                    const rowName = row.name?.trim();
                    if (!rowName) continue;
                    try {
                      const code = row.code?.trim() || `CM-${rowName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`;
                      const productRes = await fetch("/api/products", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          code,
                          name: rowName,
                          unit: row.unit?.trim() || "UNIT",
                          stockQuantity: 0,
                        }),
                      });
                      if (!productRes.ok) {
                        const errData = await productRes.json();
                        if (productRes.status === 409) { errors.push(`Skipped (exists): ${rowName}`); continue; }
                        throw new Error(errData.error || "Failed to create product");
                      }
                      const product = await productRes.json();
                      createdProducts.push({ id: product.id, row });
                      success++;
                    } catch (err) {
                      errors.push(`Error: ${rowName} - ${err instanceof Error ? err.message : "Unknown"}`);
                    }
                  }

                  if (supplierId && createdProducts.length > 0) {
                    try {
                      const existingRes = await fetch(`/api/suppliers/${supplierId}/products`);
                      const existingData = await existingRes.json();
                      const existingItems = Array.isArray(existingData.items) ? existingData.items : [];

                      const existingSupplierProducts = existingItems.map((item: { productId: string; rateListPrice: unknown; discount: unknown; wholesalePrice: unknown; retailPrice: unknown }) => ({
                        action: "set" as const,
                        productId: item.productId,
                        rate: item.rateListPrice,
                        discount: item.discount,
                        wholesalePrice: item.wholesalePrice,
                        retailPrice: item.retailPrice,
                      }));

                      const newItems = createdProducts.map(({ id, row }) => ({
                        action: "set" as const,
                        productId: id,
                        rate: toDecimalOrNull(row.rateListPrice),
                        discount: toDecimalOrZero(row.discount),
                        wholesalePrice: toDecimalOrNull(row.wholesalePrice),
                        retailPrice: toDecimalOrNull(row.retailPrice),
                      }));

                      const seen = new Set<string>();
                      const allItems = [...existingSupplierProducts, ...newItems].filter((item) => {
                        if (seen.has(item.productId)) return false;
                        seen.add(item.productId);
                        return true;
                      });

                      await fetch(`/api/suppliers/${supplierId}/products`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ items: allItems }),
                      });
                    } catch {
                      errors.push("Warning: Products created but failed to link to supplier pricing.");
                    }
                  }

                  setImportResults({ success, errors });
                  if (success > 0) {
                    toast.success(`Imported ${success} products`);
                    await fetchInitial();
                  } else if (errors.length > 0) {
                    toast.error(`${errors.length} error(s) during import`);
                  }
                } catch {
                  toast.error("Import failed");
                } finally {
                  setImporting(false);
                }
              }}
            >
              {importing ? "Importing..." : "Import"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
