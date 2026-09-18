"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ExternalLink, Package, PackageX, Search, Star, Trash2 } from "lucide-react";

import { fetchJson, ApiError } from "@/lib/fetch-json";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Category = {
  id: string;
  name: string;
  group: string;
};

type ProductVariant = {
  id: string | null;
  sku: string;
  barcode: string | null;
  name: string;
  sizeValue: number;
  sizeUnit: string;
  imageUrl: string | null;
  status: string;
};

type Product = {
  id: string;
  code: string;
  barcode: string | null;
  name: string;
  description: string | null;
  status: string;
  imageUrl: string | null;
  imageUrl2: string | null;
  isFeatured: boolean;
  unit: string;
  subcategory: string | null;
  stockQuantity: number;
  trades: string[];
  category: Category | null;
  variants: ProductVariant[];
};

function ProductImage({
  src,
  className,
}: {
  src: string | null;
  className: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || src === "null" || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}
      >
        <Package className="h-1/3 w-1/3" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt=""
        fill
        sizes="160px"
        className="rounded-md object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsContent />
    </Suspense>
  );
}

function ProductsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const status = searchParams.get("status") ?? "";
  const currentPage = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  const setSearch = (value: string) => {
    router.push(`${pathname}?${createQueryString("search", value)}`);
  };

  const setCategory = (value: string) => {
    router.push(`${pathname}?${createQueryString("category", value)}`);
  };

  const setStatus = (value: string) => {
    router.push(`${pathname}?${createQueryString("status", value)}`);
  };

  const setPage = (value: number) => {
    router.push(`${pathname}?${createQueryString("page", value > 1 ? String(value) : "")}`);
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 20;

  async function loadProducts() {
    setProductsLoading(true);
    try {
      const data = await fetchJson<Product[] | { data: Product[] }>("/api/products");
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setProducts(list);
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : "Failed to load products.";
      toast.error(msg);
    } finally {
      setProductsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const productsResponse = await fetch("/api/products");

        if (cancelled) return;

        const productsData = await productsResponse.json();

        if (cancelled) return;

        if (productsResponse.ok) {
          setProducts(
            Array.isArray(productsData) ? productsData : productsData.data ?? []
          );
        }
      } catch (error) {
        console.error("Failed to load products:", error);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const uniqueCategories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category?.name ?? "").filter(Boolean))).sort(),
    [products]
  );

  const uniqueStatuses = useMemo(
    () => Array.from(new Set(products.map((p) => p.status).filter(Boolean))).sort(),
    [products]
  );

  const filteredProducts = useMemo(() => {
    let result = products;

    const term = search.toLowerCase().trim();
    if (term) {
      result = result.filter((product) => {
        return (
          product.code.toLowerCase().includes(term) ||
          (product.barcode ?? "").toLowerCase().includes(term) ||
          product.name.toLowerCase().includes(term) ||
          (product.category?.name ?? "").toLowerCase().includes(term)
        );
      });
    }

    if (category) {
      result = result.filter((product) => product.category?.name === category);
    }

    if (status) {
      result = result.filter((product) => product.status === status);
    }

    return result;
  }, [products, search, category, status]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));

  const paginatedProducts = useMemo(
    () => filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredProducts, currentPage]
  );

  async function deleteProduct(product: Product) {
    if (
      !confirm(
        `Delete "${product.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(product.id);

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to delete product.");
        return;
      }

      await loadProducts();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete product.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Products</h1>
          </div>
          <p className="text-muted-foreground">
            Manage building materials, sizes, prices, stock and catalogue details.
          </p>
        </div>

        <Button asChild variant="outline">
          <a href="/admin/supplier-catalog">
            Go to Catalog
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Product Catalogue</CardTitle>

            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search product, SKU or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm md:w-44"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm md:w-44"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                {uniqueStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No products found.
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedProducts.map((product) => (
                <div key={product.id} className="rounded-lg border p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start">
                    <ProductImage src={product.imageUrl} className="h-20 w-20 shrink-0" />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold">{product.name}</h2>
                        <Badge>{product.code}</Badge>
                        {product.barcode && <Badge variant="outline">{product.barcode}</Badge>}
                        <Badge variant="secondary">{product.status}</Badge>
                        {product.isFeatured && (
                          <Badge variant="outline">
                            <Star className="mr-1 h-3 w-3" />
                            Featured
                          </Badge>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {product.category
                          ? `${product.category.group ? `${product.category.group} · ` : ""}${product.category.name}`
                          : "No category"}{" "}
                        · {product.unit}
                        {product.stockQuantity <= 0 ? (
                          <span className="ml-2 inline-flex items-center gap-1 font-medium text-red-600">
                            <PackageX className="h-3.5 w-3.5" />
                            Out of stock
                          </span>
                        ) : (
                          <span className="ml-2 text-foreground">
                            ·{" "}
                            {new Intl.NumberFormat("en-US", {
                              maximumFractionDigits: 2,
                            }).format(product.stockQuantity)}{" "}
                            {product.unit.toLowerCase()}
                          </span>
                        )}
                      </p>

                      {product.subcategory && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {product.subcategory}
                          </p>
                      )}

                      {Array.isArray(product.trades) && product.trades.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Trades: {product.trades.join(", ")}
                        </p>
                      )}

                      {product.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Button variant="outline" asChild>
                        <a href="/admin/supplier-catalog">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Manage in Catalog
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => deleteProduct(product)}
                        disabled={deletingId === product.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deletingId === product.id ? "..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredProducts.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}