"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Star, StarOff } from "lucide-react";

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

type Product = {
  id: string;
  code: string;
  name: string;
  unit: string;
  status: string;
  isFeatured: boolean;
  imageUrl: string | null;
  category: { name: string } | null;
};

export default function FeaturedPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products?limit=5000");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setProducts(list);
    } catch {
      toast.error("Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  async function toggleFeatured(product: Product) {
    setTogglingId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !product.isFeatured }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, isFeatured: !p.isFeatured } : p
        )
      );
      toast.success(
        product.isFeatured
          ? `"${product.name}" removed from featured.`
          : `"${product.name}" marked as featured.`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update product.");
    } finally {
      setTogglingId(null);
    }
  }

  const filtered = products.filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term) ||
      p.category?.name.toLowerCase().includes(term)
    );
  });

  const featuredCount = products.filter((p) => p.isFeatured).length;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-500" />
            <h1 className="text-2xl font-bold">Featured Products</h1>
          </div>
          <p className="text-muted-foreground">
            Toggle products to show on the homepage featured shelf.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm tabular-nums w-fit">
          {featuredCount} featured
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>All Products</CardTitle>
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 max-w-[250px] text-sm"
            />
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No products found.
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((product) => (
                <div
                  key={product.id}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors ${
                    product.isFeatured
                      ? "border-amber-200 bg-amber-50/60"
                      : "bg-background hover:bg-muted/50"
                  }`}
                >
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded border object-cover bg-muted"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border bg-muted text-muted-foreground text-[10px]">
                      N/A
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {product.name}
                      </span>
                      {product.isFeatured && (
                        <Badge
                          variant="secondary"
                          className="shrink-0 border-amber-200 bg-amber-100 text-amber-700 text-[10px]"
                        >
                          <Star className="mr-0.5 h-2.5 w-2.5" />
                          Featured
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{product.code}</span>
                      {product.category && (
                        <>
                          <span>·</span>
                          <span>{product.category.name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <Button
                    variant={product.isFeatured ? "default" : "outline"}
                    size="sm"
                    className={`shrink-0 ${
                      product.isFeatured
                        ? "bg-amber-500 hover:bg-amber-600 text-white"
                        : ""
                    }`}
                    onClick={() => toggleFeatured(product)}
                    disabled={togglingId === product.id}
                  >
                    {togglingId === product.id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : product.isFeatured ? (
                      <StarOff className="mr-1 h-3 w-3" />
                    ) : (
                      <Star className="mr-1 h-3 w-3" />
                    )}
                    {product.isFeatured ? "Remove" : "Feature"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
