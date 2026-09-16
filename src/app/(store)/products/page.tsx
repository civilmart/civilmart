"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Loader2,
  Package,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  CatalogFilterPanel,
  type CatalogFilterState,
} from "@/components/store/catalog-filter-panel";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/store/product-card";
import { StoreAdBanners } from "@/components/store/ad-banners";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  type CatalogueFilters,
  type ProductPageResult,
  type SortKey,
  SORT_OPTIONS,
  type StoreProduct,
} from "@/lib/store-front";

const DEFAULT_PAGE_SIZE = 24;

function ProductsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [filters, setFilters] = useState<CatalogueFilters | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category");
  const group = searchParams.get("group")?.trim() ?? null;
  const subcategory = searchParams.get("subcategory")?.trim() ?? null;
  const priceMin = searchParams.get("priceMin") ?? "";
  const priceMax = searchParams.get("priceMax") ?? "";
  const inStockOnly = searchParams.get("inStock") === "true";
  const sort = (searchParams.get("sort") ?? "featured") as SortKey;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);

  const activeFilterCount =
    (group ? 1 : 0) +
    (subcategory ? 1 : 0) +
    (category ? 1 : 0) +
    (priceMin || priceMax ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  const selectedCategoryLabel =
    filters?.groups
      .flatMap((g) => g.categories)
      .find((c) => c.name === category)?.name ?? category;

  const scopedGroups = useMemo(
    () =>
      group
        ? (filters?.groups ?? []).filter((g) => g.name === group)
        : (filters?.groups ?? []),
    [filters, group]
  );

  const groupSubcategories = useMemo(
    () =>
      group
        ? (filters?.subcategories ?? []).filter((s) => s.group === group)
        : (filters?.subcategories ?? []),
    [filters, group]
  );

  const showSubcategoryChips = group !== null && groupSubcategories.length > 0;

  useEffect(() => {
    let cancelled = false;

    async function loadFilters() {
      try {
        const res = await fetch("/api/store/filters");
        const data = await res.json();

        if (!cancelled && data.success) {
          setFilters(data.data as CatalogueFilters);
          setFiltersLoaded(true);
        }
      } catch (error) {
        console.error("Failed to load catalogue filters:", error);
      }
    }

    if (!filtersLoaded) {
      loadFilters();
    }

    return () => {
      cancelled = true;
    };
  }, [filtersLoaded]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const params = new URLSearchParams();
      params.set("pageSize", String(DEFAULT_PAGE_SIZE));
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (group) params.set("group", group);
      if (subcategory) params.set("subcategory", subcategory);
      if (priceMin) params.set("priceMin", priceMin);
      if (priceMax) params.set("priceMax", priceMax);
      if (inStockOnly) params.set("inStock", "true");
      params.set("sort", sort);
      params.set("page", String(page));

      try {
        const res = await fetch(`/api/store/products?${params.toString()}`);
        const productsData = await res.json();

        if (!cancelled && productsData.success) {
          const result = productsData.data as ProductPageResult;
          setProducts(result.products);
          setTotal(result.total);
          setPages(result.pages);
        }
      } catch (error) {
        console.error("Failed to load catalogue:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [search, category, group, subcategory, priceMin, priceMax, inStockOnly, sort, page]);

  const filterState: CatalogFilterState = useMemo(
    () => ({
      category,
      priceMin,
      priceMax,
      inStockOnly,
    }),
    [category, priceMin, priceMax, inStockOnly]
  );

  function buildParams(patch: Record<string, string | string[] | null>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(patch)) {
      params.delete(key);

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item) params.append(key, item);
        });
      } else if (value) {
        params.set(key, value);
      }
    }

    if (!("page" in patch)) {
      params.delete("page");
    }

    return params;
  }

  function commit(patch: Record<string, string | string[] | null>) {
    const params = buildParams(patch);
    router.replace(
      `/products${params.toString() ? `?${params.toString()}` : ""}`,
      { scroll: false }
    );
  }

  function handleFiltersChange(patch: Partial<CatalogFilterState>) {
    const next = { ...filterState, ...patch };

    commit({
      category: next.category || null,
      priceMin: next.priceMin || null,
      priceMax: next.priceMax || null,
      inStock: next.inStockOnly ? "true" : null,
    });
  }

  function clearAll() {
    commit({
      search: null,
      group: null,
      subcategory: null,
      category: null,
      priceMin: null,
      priceMax: null,
      inStock: null,
    });
  }

  function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > pages) return;
    commit({ page: String(nextPage) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const chipItems: Array<{ key: string; label: string; remove?: () => void }> = [];

  if (search) {
    chipItems.push({
      key: "search",
      label: `“${search}”`,
      remove: () => commit({ search: null }),
    });
  }
  if (category) {
    chipItems.push({
      key: "category",
      label: selectedCategoryLabel ?? category,
      remove: () => commit({ category: null }),
    });
  }
  if (priceMin || priceMax) {
    chipItems.push({
      key: "price",
      label: `Rs ${priceMin || "0"} – ${priceMax || "∞"}`,
      remove: () =>
        commit({ priceMin: null, priceMax: null, page: String(page) }),
    });
  }
  if (inStockOnly) {
    chipItems.push({
      key: "inStock",
      label: "In stock only",
      remove: () => commit({ inStock: null }), 
    });
  }

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="transition hover:text-amber-700">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        {group ? (
          <>
            <Link href="/products" className="transition hover:text-amber-700">
              All products
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-slate-900">{group}</span>
            {category && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium text-slate-900">
                  {selectedCategoryLabel ?? category}
                </span>
              </>
            )}
          </>
        ) : category ? (
          <>
            <span className="font-medium text-slate-900">All products</span>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-slate-900">
              {selectedCategoryLabel ?? category}
            </span>
          </>
        ) : (
          <span className="font-medium text-slate-900">All products</span>
        )}
      </nav>

      <SearchBox
        key={search}
        defaultValue={search}
        onCommit={(value) => commit({ search: value || null })}
      />

      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {category
              ? (selectedCategoryLabel ?? "Category")
              : (group ??
                "All products")}
            {search && (
              <span className="ml-2 text-base font-medium text-muted-foreground">
                for "{search}"
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading…" : `${total.toLocaleString()} product${total === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <select
              value={sort}
              onChange={(e) => commit({ sort: e.target.value || null })}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-amber-400"
              aria-label="Sort products"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center overflow-hidden rounded-md border border-slate-200 lg:hidden">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-sm bg-amber-500 px-1 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <ViewToggle view={view} onChange={setView} />
          </div>

          <ViewToggle view={view} onChange={setView} className="hidden lg:flex" />
        </div>
      </div>

      {group && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Main category
            </span>
            <select
              value={group}
              onChange={(e) =>
                commit({
                  group: e.target.value,
                  category: null,
                  subcategory: null,
                  page: String(page),
                })
              }
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium outline-none focus:border-amber-400"
              aria-label="Switch main category"
            >
              {(filters?.groups ?? []).map((g) => (
                <option key={g.name} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
            <Link
              href="/products"
              className="ml-auto text-xs font-semibold text-amber-700 hover:underline"
            >
              All categories
            </Link>
          </div>

          {showSubcategoryChips && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => commit({ subcategory: null, page: String(page) })}
                className={cn(
                  "shrink-0 rounded-sm border px-3 py-1.5 text-sm font-medium transition",
                  !subcategory
                    ? "border-amber-500 bg-amber-500 font-bold text-slate-950"
                    : "border-slate-200 bg-white text-slate-700 hover:border-amber-400 hover:bg-amber-50"
                )}
              >
                All {group}
              </button>
              {groupSubcategories.map((s) => (
                <button
                  key={`${s.group}-${s.name}`}
                  type="button"
                  onClick={() =>
                    commit({ subcategory: s.name, page: String(page) })
                  }
                  className={cn(
                    "shrink-0 rounded-sm border px-3 py-1.5 text-sm font-medium transition",
                    subcategory === s.name
                      ? "border-amber-500 bg-amber-500 font-bold text-slate-950"
                      : "border-slate-200 bg-white text-slate-700 hover:border-amber-400 hover:bg-amber-50"
                  )}
                >
                  {s.name}
                  <span className="ml-1 text-xs text-slate-400">{s.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <StoreAdBanners slot="PRODUCTS_BANNER" variant="strip" />

      <div className="flex items-start gap-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
            <CatalogFilterPanel
              groups={scopedGroups}
              active={filterState}
              activeCount={activeFilterCount}
              onChange={handleFiltersChange}
            />
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          {chipItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {chipItems.map((chip) => (
                <span
                  key={chip.key}
                  className="flex items-center gap-1 rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700"
                >
                  {chip.label}
                  {chip.remove && (
                    <button
                      type="button"
                      aria-label={`Remove ${chip.label} filter`}
                      onClick={chip.remove}
                      className="text-slate-400 transition hover:text-slate-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className="ml-1 text-xs font-semibold text-amber-700 hover:underline"
              >
                Clear all
              </button>
            </div>
          )}

          {loading ? (
            <div
              className={cn(
                "grid gap-3 sm:gap-4",
                view === "grid"
                  ? "grid-cols-2 sm:grid-cols-3"
                  : "grid-cols-1"
              )}
            >
              {Array.from({ length: view === "grid" ? 9 : 6 }).map((_, index) => (
                <ProductCardSkeleton key={index} layout={view} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No products found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search or filters.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={clearAll}
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                "grid gap-3 sm:gap-4",
                view === "grid"
                  ? "grid-cols-2 sm:grid-cols-3"
                  : "grid-cols-1"
              )}
            >
              {products.map((product) => (
                <ProductCard key={product.id} product={product} layout={view} />
              ))}
            </div>
          )}

          {pages > 1 && (
            <Pager page={page} pages={pages} onPageChange={goToPage} />
          )}
        </div>
      </div>

      <Sheet
        open={filtersOpen}
        onOpenChange={(open) => setFiltersOpen(open)}
      >
        <SheetContent side="left" className="w-[85%] overflow-y-auto sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            <CatalogFilterPanel
              groups={scopedGroups}
              active={filterState}
              activeCount={activeFilterCount}
              onChange={(patch) => handleFiltersChange(patch)}
            />
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="mt-6 w-full rounded-md bg-amber-500 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-400"
            >
              Show {total.toLocaleString()} product{total === 1 ? "" : "s"}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SearchBox({
  defaultValue,
  onCommit,
}: {
  defaultValue: string;
  onCommit: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit(value);
          }
        }}
        placeholder="Search products..."
        className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setValue("");
            onCommit("");
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-slate-900"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
  className,
}: {
  view: "grid" | "list";
  onChange: (view: "grid" | "list") => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "items-center overflow-hidden rounded-md border border-slate-200",
        className
      )}
    >
      <button
        type="button"
        aria-label="Grid view"
        onClick={() => onChange("grid")}
        className={cn(
          "p-2 transition",
          view === "grid" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="List view"
        onClick={() => onChange("list")}
        className={cn(
          "p-2 transition",
          view === "list" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
        )}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}

function Pager({
  page,
  pages,
  onPageChange,
}: {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}) {
  const items = useMemo(() => {
    const result: Array<number | "ellipsis-left" | "ellipsis-right"> = [];

    if (pages <= 7) {
      for (let i = 1; i <= pages; i += 1) result.push(i);

      return result;
    }

    result.push(1);

    if (page > 3) result.push("ellipsis-left");

    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i += 1) {
      result.push(i);
    }

    if (page < pages - 2) result.push("ellipsis-right");
    result.push(pages);

    return result;
  }, [page, pages]);

  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition enabled:hover:bg-slate-50 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {items.map((item, index) =>
        item === "ellipsis-left" || item === "ellipsis-right" ? (
          <span
            key={`${item}-${index}`}
            className="flex h-9 items-center px-1 text-sm text-slate-400"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              "flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-medium transition",
              item === page
                ? "border-amber-500 bg-amber-500 font-bold text-slate-950"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition enabled:hover:bg-slate-50 disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ProductsPageInner />
    </Suspense>
  );
}