"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { type StoreProduct } from "@/lib/store-front";

function ProductsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "all";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const params = new URLSearchParams();
      params.set("limit", "100");
      if (search) params.set("search", search);
      if (category && category !== "all") params.set("category", category);

      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch(`/api/store/products?${params.toString()}`),
          fetch("/api/store/categories"),
        ]);

        const [productsData, categoriesData] = await Promise.all([
          productsRes.json(),
          categoriesRes.json(),
        ]);

        if (!cancelled) {
          if (productsData.success) setProducts(productsData.data);
          if (categoriesData.success) setCategories(categoriesData.data);
        }
      } catch (error) {
        console.error("Failed to load products:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [search, category]);

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`/products${params.toString() ? `?${params.toString()}` : ""}`, {
      scroll: false,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All fragrances</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading…" : `${products.length} product${products.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex items-center rounded-full border bg-slate-50 px-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              defaultValue={search}
              placeholder="Search…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateParams("search", (e.target as HTMLInputElement).value);
                }
              }}
              className="w-full bg-transparent px-2 py-2 text-sm outline-none sm:w-44"
            />
          </div>

          <select
            value={category === "all" ? "all" : category}
            onChange={(e) => updateParams("category", e.target.value)}
            className="rounded-full border bg-white px-4 py-2 text-sm outline-none"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No products match your search. Try clearing the filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
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