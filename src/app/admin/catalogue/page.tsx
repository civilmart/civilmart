"use client";

import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { CheckSquare, ChevronDown, ChevronRight, ExternalLink, ListChecks, PackageX, Star, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Category = {
  id: string;
  name: string;
  group: string | null;
};

type TreeProduct = {
  id: string;
  code: string;
  name: string;
  unit: string;
  stockQuantity: number;
  status: string;
  imageUrl: string | null;
  isFeatured: boolean;
  description: string | null;
  categoryName: string | null;
};

type Leaf = {
  id: string;
  name: string;
  products: TreeProduct[];
};

type Main = {
  key: string;
  name: string;
  leaves: Leaf[];
};

const BULK_ACTIONS = [
  "Delete selected items",
  "Mark selected as active",
  "Mark selected as inactive",
  "Mark selected as discontinued",
  "Print selected items with rates",
  "Export selected as CSV",
];

const STATUS_BY_ACTION: Record<string, "ACTIVE" | "INACTIVE" | "DISCONTINUED"> =
  {
    "Delete selected items": "DISCONTINUED",
    "Mark selected as active": "ACTIVE",
    "Mark selected as inactive": "INACTIVE",
    "Mark selected as discontinued": "DISCONTINUED",
  };

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
      title={`${checked ? "Deselect" : "Select"} ${label}`}
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

function toTree(
  categories: Category[],
  products: Array<{
    id: string;
    code: string;
    name: string;
    unit: string;
    stockQuantity: number;
    status: string;
    imageUrl: string | null;
    isFeatured: boolean;
    description: string | null;
    category: { id: string; name: string; group: string | null } | null;
  }>
): Main[] {
  const mains = new Map<string, Main>();
  const leaves = new Map<string, Leaf>();

  function ensureMain(key: string, name: string): Main {
    let main = mains.get(key);

    if (!main) {
      main = { key, name, leaves: [] };
      mains.set(key, main);
    }

    return main;
  }

  function ensureLeaf(
    main: Main,
    leafId: string,
    leafName: string
  ): Leaf {
    let leaf = leaves.get(leafId);

    if (!leaf) {
      leaf = { id: leafId, name: leafName, products: [] };
      leaves.set(leafId, leaf);
      main.leaves.push(leaf);
    }

    return leaf;
  }

  for (const category of categories) {
    if (category.group) {
      const main = ensureMain(`group:${category.group}`, category.group);
      ensureLeaf(main, category.id, category.name);
    } else {
      const main = ensureMain(`standalone:${category.id}`, category.name);
      ensureLeaf(main, category.id, category.name);
    }
  }

  const noCategoryMain = ensureMain("none", "No category");
  const noCategoryLeaf = ensureLeaf(noCategoryMain, "none", "Uncategorised");

  for (const product of products) {
    const leaf = product.category
      ? leaves.get(product.category.id)
      : noCategoryLeaf;

    if (!leaf) {
      const main = product.category?.group
        ? ensureMain(`group:${product.category.group}`, product.category.group)
        : product.category
          ? ensureMain(`standalone:${product.category.id}`, product.category.name)
          : noCategoryMain;

      const created = ensureLeaf(
        main,
        product.category?.id ?? `product-${product.id}`,
        product.category?.name ?? "Uncategorised"
      );

      created.products.push(toTreeProduct(product));

      continue;
    }

    leaf.products.push(toTreeProduct(product));
  }

  const sorted = [...mains.values()]
    .map((main) => ({
      ...main,
      leaves: main.leaves.map((leaf) => ({
        ...leaf,
        products: [...leaf.products].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      })),
    }))
    .filter((main) => main.leaves.length > 0)
    .sort((a, b) => {
      if (a.key === "none") return 1;
      if (b.key === "none") return -1;
      return Number(!b.leaves[0]?.products.length) - Number(!a.leaves[0]?.products.length) ||
        a.name.localeCompare(b.name);
    });

  return sorted;
}

function toTreeProduct(product: {
  id: string;
  code: string;
  name: string;
  unit: string;
  stockQuantity: number;
  status: string;
  imageUrl: string | null;
  isFeatured: boolean;
  description?: string | null;
  category?: { name: string } | null;
}): TreeProduct {
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    unit: product.unit,
    stockQuantity: Number(product.stockQuantity ?? 0),
    status: product.status,
    imageUrl: product.imageUrl,
    isFeatured: product.isFeatured,
    description: product.description ?? null,
    categoryName: product.category?.name ?? null,
  };
}

export default function CataloguePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<
    Array<{
      id: string;
      code: string;
      name: string;
      unit: string;
      stockQuantity: number;
      status: string;
      imageUrl: string | null;
      isFeatured: boolean;
      description: string | null;
      category: { id: string; name: string; group: string | null } | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsedMains, setCollapsedMains] = useState<Set<string>>(new Set());
  const [collapsedLeaves, setCollapsedLeaves] = useState<Set<string>>(new Set());
  const [detailProduct, setDetailProduct] = useState<TreeProduct | null>(null);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/products");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          (data as { error?: string }).error || "Failed to load products"
        );
      }

      return Array.isArray(data) ? (data as typeof products) : [];
    } catch (error) {
      console.error("Failed to load products:", error);
      return [];
    }
  }, []);

  async function reloadProducts() {
    const list = await fetchProducts();
    setProducts(list);
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [categoriesData, productsData] = await Promise.all([
          fetch("/api/categories?withCounts=true").then((response) =>
            response.json()
          ),
          fetchProducts(),
        ]);

        if (cancelled) return;

        setCategories(
          Array.isArray(categoriesData)
            ? (categoriesData as Category[]).map((category) => ({
                id: category.id,
                name: category.name,
                group: category.group ?? null,
              }))
            : []
        );
        if (Array.isArray(categoriesData)) {
          const list = categoriesData as Category[];
          setCollapsedMains(
            new Set(
              list.map((category) =>
                category.group
                  ? `group:${category.group}`
                  : `standalone:${category.id}`
              )
            )
          );
          setCollapsedLeaves(
            new Set(list.map((category) => category.id))
          );
        }
        setProducts(productsData);
      } catch (error) {
        console.error("Failed to load catalogue:", error);
        setNotice("Failed to load the catalogue.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [fetchProducts]);

  const tree = useMemo(
    () => toTree(categories, products),
    [categories, products]
  );

  const filteredTree = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return tree;

    return tree
      .map((main) => ({
        ...main,
        leaves: main.leaves
          .map((leaf) => ({
            ...leaf,
            products: leaf.products.filter(
              (product) =>
                product.name.toLowerCase().includes(term) ||
                product.code.toLowerCase().includes(term)
            ),
          }))
          .filter((leaf) => leaf.products.length > 0),
      }))
      .filter((main) => main.leaves.length > 0);
  }, [tree, search]);

  const allProductIds = useMemo(
    () => filteredTree.flatMap((main) => main.leaves.flatMap((leaf) => leaf.products.map((p) => p.id))),
    [filteredTree]
  );

  const productCount = useMemo(
    () => products.length,
    [products]
  );

  const selectedCount = selected.size;

  const allSelected =
    allProductIds.length > 0 && allProductIds.every((id) => selected.has(id));

  const leafTotals = useMemo(
    () =>
      filteredTree.flatMap((main) =>
        main.leaves.map((leaf) => ({
          main,
          leaf,
          productIds: leaf.products.map((product) => product.id),
        }))
      ),
    [filteredTree]
  );

  function toggleProduct(id: string) {
    setSelected((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function toggleLeaf(ids: string[]) {
    if (ids.length === 0) return;

    setSelected((current) => {
      const next = new Set(current);
      const allPicked = ids.every((id) => next.has(id));

      for (const id of ids) {
        if (allPicked) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }

      return next;
    });
  }

  function toggleCategory(category: "main" | "leaf", key: string) {
    const ids =
      category === "main"
        ? leafTotals
            .filter((item) => item.main.key === key)
            .flatMap((item) => item.leaf.products.map((p) => p.id))
        : (leafTotals.find((item) => item.leaf.id === key)?.leaf.products.map(
            (p) => p.id
          ) ?? []);

    toggleLeaf(ids);
  }

  function isLeafChecked(leafId: string): boolean {
    const ids =
      leafTotals.find((item) => item.leaf.id === leafId)?.productIds ?? [];

    return ids.length > 0 && ids.every((id) => selected.has(id));
  }

  function isLeafIndeterminate(leafId: string): boolean {
    const ids =
      leafTotals.find((item) => item.leaf.id === leafId)?.productIds ?? [];

    return ids.some((id) => selected.has(id)) && !isLeafChecked(leafId);
  }

  function hasProducts(main: Main): boolean {
    return main.leaves.some((leaf) => leaf.products.length > 0);
  }

  function mainChecked(main: Main): boolean {
    const ids = leafTotals
      .filter((item) => item.main.key === main.key)
      .flatMap((item) => item.productIds);
    return ids.length > 0 && ids.every((id) => selected.has(id));
  }

  function mainIndeterminate(main: Main): boolean {
    const ids = leafTotals
      .filter((item) => item.main.key === main.key)
      .flatMap((item) => item.productIds);
    return ids.some((id) => selected.has(id)) && !mainChecked(main);
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected((current) => {
        const next = new Set(current);
        for (const id of allProductIds) next.delete(id);
        return next;
      });
    } else {
      setSelected((current) => {
        const next = new Set(current);
        for (const id of allProductIds) next.add(id);
        return next;
      });
    }
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function toggleMainCollapsed(key: string) {
    setCollapsedMains((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleLeafCollapsed(id: string) {
    setCollapsedLeaves((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectedProducts() {
    return products.filter((product) => selected.has(product.id));
  }

  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function printSelected() {
    const items = selectedProducts();

    if (items.length === 0) return;

    const now = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date());
    const number = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    });

    const rows = items
      .map((product) => {
        const category = product.category?.name ?? "Uncategorised";

        return `<tr>
          <td>${escapeHtml(product.code)}</td>
          <td>${escapeHtml(product.name)}</td>
          <td>${escapeHtml(category)}</td>
          <td class="na">${escapeHtml(product.unit)}</td>
          <td class="na">${number.format(Number(product.stockQuantity ?? 0))}</td>
          <td>${escapeHtml(product.status)}</td>
        </tr>`;
      })
      .join("");

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Civil Mart &mdash; Selected items with rates</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; padding: 32px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .meta { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
  th { background: #f9fafb; font-weight: 600; }
  .na { text-align: right; white-space: nowrap; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>Civil Mart</h1>
  <div class="meta">Product list &mdash; ${items.length} ${
    items.length === 1 ? "item" : "items"
  } &middot; ${escapeHtml(now)}</div>
  <table>
    <thead>
      <tr>
        <th>Code</th>
        <th>Name</th>
        <th>Category</th>
        <th class="na">Unit</th>
        <th class="na">Stock</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

    const win = window.open("", "_blank", "width=1000,height=700");

    if (!win) {
      setNotice("Popup blocked. Allow popups for this site to print.");
      return;
    }

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();

    setTimeout(() => {
      try {
        win.print();
      } catch {
        setNotice("Could not open the print dialog.");
      }
    }, 250);
  }

  function exportCsv() {
    const items = selectedProducts();

    if (items.length === 0) return;

    const header = ["Code", "Name", "Category", "Unit", "Stock", "Status"];

    const rows = items.map((product) => [
      product.code,
      product.name,
      product.category?.name ?? "Uncategorised",
      product.unit,
      String(Number(product.stockQuantity ?? 0)),
      product.status,
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      )
      .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `civilmart-selected-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    setNotice(`Exported ${items.length} product(s) to CSV.`);
  }

  async function runBulkAction(action: string) {
    if (selectedCount === 0) return;

    if (action === "Print selected items with rates") {
      printSelected();
      return;
    }

    if (action === "Export selected as CSV") {
      exportCsv();
      return;
    }

    const status = STATUS_BY_ACTION[action];

    if (!status) return;

    try {
      const response = await fetch("/api/products/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], status }),
      });

      const data = await response.json();

      if (!response.ok) {
        setNotice(data.error || "Failed to update products.");
        return;
      }

      await reloadProducts();
      setSelected(new Set());
      setNotice(
        action === "Delete selected items"
          ? `Deleted ${data.count ?? selectedCount} product(s) (marked as discontinued).`
          : `Marked ${data.count ?? selectedCount} product(s) as ${data.status}.`
      );
    } catch {
      setNotice("Network error while updating products.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-muted-foreground">
        <ListChecks className="mr-2 h-5 w-5 animate-pulse" />
        Loading catalogue…
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <div className="flex items-center gap-2">
          <ListChecks className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Catalogue Tree</h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          Tick products across categories and run bulk actions on the selection.
        </p>
      </div>

      <div className="sticky top-0 z-30 -mx-6 border-b bg-background/95 px-6 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <CheckSquare className="h-4 w-4 text-amber-600" />
            {selectedCount} of {productCount} products selected
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              aria-label="Bulk actions"
              disabled={selectedCount === 0}
              defaultValue=""
              onChange={(event) => {
                if (event.target.value) {
                  runBulkAction(event.target.value);
                  event.target.value = "";
                }
              }}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-40"
            >
              <option value="">Bulk actions…</option>
              {BULK_ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>

            <Button variant="outline" size="sm" onClick={toggleSelectAll}>
              {allSelected ? "Deselect all" : "Select all"}
            </Button>

            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      </div>

      {notice && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {notice}
        </div>
      )}

      <div className="relative w-full md:w-96">
        <Input
          placeholder="Search product or code in the tree…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All catalogue items</CardTitle>
        </CardHeader>

        <CardContent>
          {filteredTree.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {products.length === 0
                ? "No products in the catalogue yet."
                : "No matches for your search."}
            </div>
          ) : (
            <div className="space-y-5">
              {filteredTree.map((main) => {
                const mainTotal = main.leaves.reduce(
                  (sum, leaf) => sum + leaf.products.length,
                  0
                );

                return (
                  <div key={main.key} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleMainCollapsed(main.key)}
                        aria-label={
                          collapsedMains.has(main.key)
                            ? `Expand ${main.name}`
                            : `Collapse ${main.name}`
                        }
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                      >
                        {collapsedMains.has(main.key) ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      <TriCheckbox
                        checked={mainChecked(main)}
                        indeterminate={mainIndeterminate(main)}
                        disabled={!hasProducts(main)}
                        onChange={() => toggleCategory("main", main.key)}
                        label={
                          <span className="font-semibold">{main.name}</span>
                        }
                      />
                      <Badge variant="secondary">
                        {mainTotal} {mainTotal === 1 ? "item" : "items"}
                      </Badge>
                      <Badge variant="outline">
                        {main.leaves.length}{" "}
                        {main.leaves.length === 1 ? "category" : "categories"}
                      </Badge>
                    </div>

                    {!collapsedMains.has(main.key) && (
                      <div className="mt-3 space-y-3 pl-5">
                        {main.leaves.map((leaf) => (
                          <div key={leaf.id} className="border-l border-dashed pl-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleLeafCollapsed(leaf.id)}
                                aria-label={
                                  collapsedLeaves.has(leaf.id)
                                    ? `Expand ${leaf.name}`
                                    : `Collapse ${leaf.name}`
                                }
                                className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                              >
                                {collapsedLeaves.has(leaf.id) ? (
                                  <ChevronRight className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                              <TriCheckbox
                                checked={isLeafChecked(leaf.id)}
                                indeterminate={isLeafIndeterminate(leaf.id)}
                                disabled={leaf.products.length === 0}
                                onChange={() =>
                                  toggleCategory("leaf", leaf.id)
                                }
                                label={
                                  <span className="font-medium text-muted-foreground">
                                    {leaf.name}
                                  </span>
                                }
                              />
                              <Badge variant="outline">
                                {leaf.products.length}
                              </Badge>
                            </div>

                            {!collapsedLeaves.has(leaf.id) &&
                              leaf.products.length > 0 && (
                                <div className="mt-2 space-y-1.5 pl-5">
                                  {leaf.products.map((product) => (
                                    <div
                                      key={product.id}
                                      className={`flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5 ${
                                        selected.has(product.id)
                                          ? "bg-amber-50"
                                          : ""
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selected.has(product.id)}
                                        onChange={() => toggleProduct(product.id)}
                                        aria-label={`Select ${product.name}`}
                                        className="h-4 w-4 shrink-0 rounded border-input accent-amber-600"
                                      />

                                      <button
                                        type="button"
                                        onClick={() => setDetailProduct(product)}
                                        title="View product description"
                                        className="inline-flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left text-sm hover:underline"
                                      >
                                        <span className="font-medium">
                                          {product.name}
                                        </span>
                                        <Badge variant="outline">
                                          {product.code}
                                        </Badge>
                                        {product.status !== "ACTIVE" && (
                                          <Badge variant="secondary">
                                            {product.status}
                                          </Badge>
                                        )}
                                        {product.isFeatured && (
                                          <Star className="h-3.5 w-3.5 text-amber-600" />
                                        )}
                                      </button>

                                      <span className="ml-auto text-sm text-muted-foreground">
                                        {product.unit.toLowerCase()}
                                        {product.stockQuantity <= 0 ? (
                                          <span className="ml-2 inline-flex items-center gap-1 font-medium text-red-600">
                                            <PackageX className="h-3.5 w-3.5" />
                                            Out of stock
                                          </span>
                                        ) : (
                                          <span className="ml-2">
                                            ·{" "}
                                            {new Intl.NumberFormat("en-US", {
                                              maximumFractionDigits: 2,
                                            }).format(product.stockQuantity)}{" "}
                                            {product.unit.toLowerCase()}
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {detailProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDetailProduct(null)}
          />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-md border border-amber-200 bg-background shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div className="min-w-0">
                <h2 className="text-lg font-bold leading-tight">
                  {detailProduct.name}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline">{detailProduct.code}</Badge>
                  {detailProduct.status !== "ACTIVE" && (
                    <Badge variant="secondary">
                      {detailProduct.status}
                    </Badge>
                  )}
                  {detailProduct.categoryName && (
                    <span className="text-xs text-muted-foreground">
                      {detailProduct.categoryName}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                aria-label="Close"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailProduct.imageUrl && (
              <div className="flex justify-center border-b bg-muted/40 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={detailProduct.imageUrl}
                  alt={detailProduct.name}
                  className="max-h-52 rounded-md object-contain"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-5 text-sm">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Unit
                </div>
                <div className="mt-0.5 font-medium">
                  {detailProduct.unit}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Stock
                </div>
                <div className="mt-0.5 font-medium">
                  {detailProduct.stockQuantity <= 0
                    ? "Out of stock"
                    : `${new Intl.NumberFormat("en-US", {
                        maximumFractionDigits: 2,
                      }).format(detailProduct.stockQuantity)} ${detailProduct.unit.toLowerCase()}`}
                </div>
              </div>
            </div>

            <div className="border-t p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Description
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm">
                {detailProduct.description?.trim() ||
                  "No description for this product yet."}
              </p>
            </div>

            <div className="border-t bg-muted/40 p-4">
              <a
                href={`/products/${detailProduct.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
              >
                <ExternalLink className="h-4 w-4" />
                View complete product details
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}