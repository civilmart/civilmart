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
  Settings2,
  Save,
  ShoppingCart,
  Truck,
  Upload,
  X,
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

function VariantForm({
  form,
  setForm,
  onUpload,
  saving,
  onSave,
  onCancel,
  productUnit,
}: {
  form: { name: string; sku: string; barcode: string; sizeValue: string; sizeUnit: string; imageUrl: string };
  setForm: React.Dispatch<React.SetStateAction<{ name: string; sku: string; barcode: string; sizeValue: string; sizeUnit: string; imageUrl: string }>>;
  onUpload: () => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  productUnit?: string;
}) {
  return (
    <div className="space-y-2">
      <Input autoFocus placeholder="Variant name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="h-7 text-xs" />
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="SKU" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} className="h-7 text-xs" />
        <Input placeholder="Barcode (optional)" value={form.barcode} onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))} className="h-7 text-xs" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Size value" inputMode="decimal" value={form.sizeValue} onChange={(e) => setForm((f) => ({ ...f, sizeValue: e.target.value }))} className="h-7 text-xs" />
        <Select value={form.sizeUnit} onValueChange={(val) => setForm((f) => ({ ...f, sizeUnit: val }))}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_UNITS.map((u) => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs" type="button" onClick={onUpload}>
          {form.imageUrl ? "Change Image" : "Upload Image"}
        </Button>
        {form.imageUrl && (
          <img src={form.imageUrl} alt="Preview" className="h-7 w-7 rounded object-cover" />
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="h-7 text-xs" disabled={saving} onClick={onSave}>
          {saving ? "Saving…" : "Save"}
        </Button>
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
  const [addProductCategoryId, setAddProductCategoryId] = useState("");
  const [newProductCode, setNewProductCode] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductUnit, setNewProductUnit] = useState("PIECE");
  const [printingBarcodes, setPrintingBarcodes] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [error, setError] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{success: number; errors: string[]}>({ success: 0, errors: [] });
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);

  const [variantProductId, setVariantProductId] = useState<string | null>(null);
  const [variantProduct, setVariantProduct] = useState<TreeProduct | null>(null);
  const [variantList, setVariantList] = useState<Array<{
    id: string; name: string; sku: string; barcode: string | null;
    sizeValue: number; sizeUnit: string; imageUrl: string | null;
  }>>([]);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState<{
    name: string; sku: string; barcode: string; sizeValue: string;
    sizeUnit: string; imageUrl: string;
  }>({ name: "", sku: "", barcode: "", sizeValue: "", sizeUnit: "UNIT", imageUrl: "" });
  const [savingVariant, setSavingVariant] = useState(false);
  const variantFileRef = useRef<HTMLInputElement>(null);

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

  async function createProduct(categoryId: string) {
    const code = newProductCode.trim();
    const name = newProductName.trim();
    if (!code || !name) {
      setNotice("Product code and name are required.");
      toast.error("Product code and name are required.");
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
        toast.error(data.error || "Failed to create product.");
        return;
      }
      setAddProductCategoryId("");
      setNewProductCode("");
      setNewProductName("");
      setNewProductUnit("PIECE");
      setNotice(`Product "${name}" created.`);
      toast.success(`Product "${name}" created.`);
      await fetchInitial();
    } catch (e) {
      console.error("Failed to create product:", e);
      setNotice("Failed to create product.");
      toast.error("Failed to create product.");
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

  async function openVariants(product: TreeProduct) {
    setVariantProductId(product.id);
    setVariantProduct(product);
    setEditingVariantId(null);
    setVariantForm({ name: "", sku: "", barcode: "", sizeValue: "", sizeUnit: "UNIT", imageUrl: "" });
    try {
      const res = await fetch(`/api/products/${product.id}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.variants)) {
        setVariantList(data.variants.map((v: { id: string; name: string; sku: string; barcode: string | null; sizeValue: number; sizeUnit: string; imageUrl: string | null }) => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          barcode: v.barcode,
          sizeValue: v.sizeValue,
          sizeUnit: v.sizeUnit,
          imageUrl: v.imageUrl,
        })));
      }
    } catch {
      toast.error("Failed to load variants.");
    }
  }

  function startEditVariant(v: typeof variantList[number]) {
    setEditingVariantId(v.id);
    setVariantForm({
      name: v.name,
      sku: v.sku,
      barcode: v.barcode ?? "",
      sizeValue: String(v.sizeValue),
      sizeUnit: v.sizeUnit,
      imageUrl: v.imageUrl ?? "",
    });
  }

  function startAddVariant() {
    setEditingVariantId("__new__");
    setVariantForm({ name: "", sku: "", barcode: "", sizeValue: "", sizeUnit: variantProduct?.unit ?? "UNIT", imageUrl: "" });
  }

  async function handleVariantImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", "product");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        setVariantForm((f) => ({ ...f, imageUrl: data.url }));
      } else {
        toast.error(data.error || "Upload failed.");
      }
    } catch {
      toast.error("Image upload failed.");
    }
    if (variantFileRef.current) variantFileRef.current.value = "";
  }

  async function saveVariant() {
    if (!variantProductId) return;
    const { name, sku, barcode, sizeValue, sizeUnit, imageUrl } = variantForm;
    const sv = parseFloat(sizeValue);
    if (!name.trim() || !sku.trim()) {
      toast.error("Name and SKU are required.");
      return;
    }
    if (!Number.isFinite(sv) || sv <= 0) {
      toast.error("Size must be a positive number.");
      return;
    }

    setSavingVariant(true);
    const variants = variantList.map((v) => ({
      id: v.id === editingVariantId ? v.id : v.id,
      name: v.name,
      sku: v.sku,
      barcode: v.barcode ?? undefined,
      sizeValue: v.sizeValue,
      sizeUnit: v.sizeUnit,
      imageUrl: v.imageUrl ?? undefined,
    }));

    if (editingVariantId === "__new__") {
      variants.push({ id: undefined as unknown as string, name: name.trim(), sku: sku.trim(), barcode: barcode.trim() || undefined, sizeValue: sv, sizeUnit, imageUrl: imageUrl || undefined });
    } else if (editingVariantId) {
      const idx = variants.findIndex((v) => v.id === editingVariantId);
      if (idx !== -1) {
        variants[idx] = { ...variants[idx], name: name.trim(), sku: sku.trim(), barcode: barcode.trim() || undefined, sizeValue: sv, sizeUnit, imageUrl: imageUrl || undefined };
      }
    }

    try {
      const res = await fetch(`/api/products/${variantProductId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variants }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save variant.");
        return;
      }
      toast.success("Variant saved.");
      setEditingVariantId(null);
      await openVariants(variantProduct!);
      await fetchInitial();
    } catch {
      toast.error("Failed to save variant.");
    } finally {
      setSavingVariant(false);
    }
  }

  async function deleteVariant(variantId: string) {
    if (!variantProductId) return;
    const variants = variantList
      .filter((v) => v.id !== variantId)
      .map((v) => ({ id: v.id, name: v.name, sku: v.sku, barcode: v.barcode ?? undefined, sizeValue: v.sizeValue, sizeUnit: v.sizeUnit, imageUrl: v.imageUrl ?? undefined }));
    setSavingVariant(true);
    try {
      const res = await fetch(`/api/products/${variantProductId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variants }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete variant.");
        return;
      }
      toast.success("Variant deleted.");
      setEditingVariantId(null);
      await openVariants(variantProduct!);
      await fetchInitial();
    } catch {
      toast.error("Failed to delete variant.");
    } finally {
      setSavingVariant(false);
    }
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
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="mr-1 h-4 w-4" />Import CSV</Button>
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
                        <div className="border-t px-3 py-3 space-y-3">
                          {advancedMode && (supplier.contactName || supplier.phone || supplier.email || supplier.address || supplier.notes) && (
                            <div className="rounded-md border bg-muted/50 px-3 py-2 text-xs space-y-1">
                              {supplier.contactName && (
                                <p><span className="text-muted-foreground">Contact:</span> {supplier.contactName}</p>
                              )}
                              {supplier.phone && (
                                <p><span className="text-muted-foreground">Phone:</span> {supplier.phone}</p>
                              )}
                              {supplier.email && (
                                <p><span className="text-muted-foreground">Email:</span> {supplier.email}</p>
                              )}
                              {supplier.address && (
                                <p><span className="text-muted-foreground">Address:</span> {supplier.address}</p>
                              )}
                              {supplier.notes && (
                                <p><span className="text-muted-foreground">Notes:</span> {supplier.notes}</p>
                              )}
                            </div>
                          )}
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

                          {loadingLines ? (
                            <div className="space-y-3 max-h-96 overflow-auto">
                              {[1, 2, 3].map((i) => (
                                <div key={i} className="space-y-2 rounded-lg border p-2">
                                  <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 animate-pulse rounded bg-muted" />
                                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                                    <div className="h-3 w-8 animate-pulse rounded bg-muted" />
                                  </div>
                                  {[1, 2, 3].map((j) => (
                                    <div key={j} className="ml-5 flex items-center gap-2">
                                      <div className="h-3 w-3 animate-pulse rounded bg-muted" />
                                      <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
                                      <div className="h-3 w-12 animate-pulse rounded bg-muted" />
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          ) : filteredTree.length === 0 ? (
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
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 px-1.5 text-[10px]"
                                                onClick={() => void openVariants(product)}
                                              >
                                                Variants
                                              </Button>
                                            </div>
                                            {checked && (
                                              <div className={`ml-5 mt-1 grid gap-1 ${advancedMode ? "grid-cols-2 lg:grid-cols-6" : "grid-cols-2 lg:grid-cols-3"}`}>
                                                {advancedMode && (
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
                                                )}
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
                                                {advancedMode && (
                                                  <>
                                                    <Input value={line.wholesalePrice ?? ""} onChange={(e) => setLine(product.id, { wholesalePrice: toDecimalOrNull(e.target.value) })} placeholder="Wholesale" inputMode="decimal" className="h-6 text-[11px]" />
                                                    <Input value={line.retailPrice ?? ""} onChange={(e) => setLine(product.id, { retailPrice: toDecimalOrNull(e.target.value) })} placeholder="Retail" inputMode="decimal" className="h-6 text-[11px]" />
                                                  </>
                                                )}
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

      <Dialog open={!!variantProductId} onOpenChange={(open) => { if (!open) { setVariantProductId(null); setEditingVariantId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Variants — {variantProduct?.name ?? ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-auto">
            {variantList.length === 0 && editingVariantId !== "__new__" && (
              <p className="text-sm text-muted-foreground">No variants yet.</p>
            )}
            {variantList.map((v) => (
              <div key={v.id} className="rounded-md border p-3 space-y-2">
                {editingVariantId === v.id ? (
                  <VariantForm
                    form={variantForm}
                    setForm={setVariantForm}
                    onUpload={() => variantFileRef.current?.click()}
                    saving={savingVariant}
                    onSave={() => void saveVariant()}
                    onCancel={() => setEditingVariantId(null)}
                    productUnit={variantProduct?.unit}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    {v.imageUrl ? (
                      <img src={v.imageUrl} alt={v.name} className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground">No img</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{v.name}</p>
                      <p className="text-[11px] text-muted-foreground">SKU: {v.sku}{v.barcode ? ` · Barcode: ${v.barcode}` : ""} · {v.sizeValue} {v.sizeUnit}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => startEditVariant(v)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => void deleteVariant(v.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {editingVariantId === "__new__" && (
              <div className="rounded-md border p-3 space-y-2">
                <VariantForm
                  form={variantForm}
                  setForm={setVariantForm}
                  onUpload={() => variantFileRef.current?.click()}
                  saving={savingVariant}
                  onSave={() => void saveVariant()}
                  onCancel={() => setEditingVariantId(null)}
                  productUnit={variantProduct?.unit}
                />
              </div>
            )}
            {editingVariantId !== "__new__" && (
              <Button variant="outline" size="sm" className="w-full" onClick={startAddVariant}>
                <Plus className="mr-1 h-3 w-3" />
                Add Variant
              </Button>
            )}
          </div>
          <input ref={variantFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleVariantImageUpload(e)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showImport} onOpenChange={(open) => { if (!open) { setShowImport(false); setImportFile(null); setImportPreview([]); setImportResults({ success: 0, errors: [] }); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import Products from CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              CSV columns: name, code, unit, category, brand, rateListPrice, discount, retailPrice, wholesalePrice
            </p>
            <input
              type="file"
              accept=".csv"
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
            {importPreview.length > 0 && (
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted">
                      {Object.keys(importPreview[0]).map((key) => (
                        <th key={key} className="px-2 py-1 text-left font-medium">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row, i) => (
                      <tr key={i} className="border-b">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-2 py-1">{String(val ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {importing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing... {importResults.success} products created, {importResults.errors.length} errors
              </div>
            )}
            {importResults.errors.length > 0 && !importing && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {importResults.errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive">{err}</p>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowImport(false); setImportFile(null); setImportPreview([]); }}>Cancel</Button>
              <Button
                disabled={!importFile || importing}
                onClick={async () => {
                  if (!importFile) return;
                  setImporting(true);
                  setImportResults({ success: 0, errors: [] });
                  try {
                    const results = await new Promise<{success: number; errors: string[]}>((resolve) => {
                      Papa.parse(importFile, {
                        header: true,
                        skipEmptyLines: true,
                        complete: async (parsed) => {
                          let success = 0;
                          const errors: string[] = [];
                          for (const row of parsed.data as Record<string, string>[]) {
                            const name = row.name?.trim();
                            if (!name) continue;
                            try {
                              const code = row.code?.trim() || `CM-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`;
                              const productRes = await fetch("/api/products", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  code,
                                  name,
                                  unit: row.unit?.trim() || "UNIT",
                                  stockQuantity: 0,
                                }),
                              });
                              if (!productRes.ok) {
                                const errData = await productRes.json();
                                if (productRes.status === 409) { errors.push(`Skipped (exists): ${name}`); continue; }
                                throw new Error(errData.error || "Failed to create product");
                              }
                              const product = await productRes.json();
                              if (supplierId) {
                                await fetch(`/api/suppliers/${supplierId}/products`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    items: [{
                                      action: "set",
                                      productId: product.id,
                                      rate: toDecimalOrNull(row.rateListPrice),
                                      discount: toDecimalOrZero(row.discount),
                                      wholesalePrice: toDecimalOrNull(row.wholesalePrice),
                                      retailPrice: toDecimalOrNull(row.retailPrice),
                                    }],
                                  }),
                                });
                              }
                              success++;
                            } catch (err) {
                              errors.push(`Error: ${name} - ${err instanceof Error ? err.message : "Unknown"}`);
                            }
                          }
                          resolve({ success, errors });
                        },
                      });
                    });
                    setImportResults(results);
                    if (results.success > 0) {
                      toast.success(`Imported ${results.success} products`);
                      await fetchInitial();
                    }
                  } catch (err) {
                    toast.error("Import failed");
                  } finally {
                    setImporting(false);
                  }
                }}
              >
                {importing ? "Importing..." : "Import"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
