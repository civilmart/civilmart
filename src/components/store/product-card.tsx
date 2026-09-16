"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Heart, ShoppingBag } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/cart-context";
import { useWishlist } from "@/context/wishlist-context";
import {
  defaultCartVariant,
  effectivePrice,
  formatPrice,
  isInStock,
  placeholderImage,
  productUnitLabel,
  sizeLabel,
  type StoreProduct,
} from "@/lib/store-front";

type Layout = "grid" | "list";

function buildCartItem(product: StoreProduct) {
  const variant = defaultCartVariant(product);
  const price = effectivePrice(product);

  if (price === null) return null;

  return {
    id: variant?.id ?? product.id,
    productId: product.id,
    variantId: variant?.id ?? null,
    sku: variant?.sku ?? product.code,
    productName: product.name,
    variantName: (variant && (variant.name || sizeLabel(variant))) || null,
    unit: variant?.sizeUnit ?? product.unit,
    unitPrice: price,
    imageUrl: variant?.imageUrl ?? product.imageUrl,
    stockQuantity: product.stockQuantity,
  };
}

export function ProductCard({
  product,
  layout = "grid",
}: {
  product: StoreProduct;
  layout?: Layout;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const { loggedIn, wishlistedIds, toggle } = useWishlist();
  const [added, setAdded] = useState(false);

  const inStock = isInStock(product);
  const price = effectivePrice(product);
  const wishlisted = wishlistedIds.has(product.id);

  const mainSrc = product.imageUrl || placeholderImage(product.name);
  const cartItem = buildCartItem(product);

  async function handleToggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!loggedIn) {
      router.push("/account");
      return;
    }

    await toggle(product.id);
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!cartItem || !inStock) return;

    addItem(cartItem, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  if (layout === "list") {
    return (
      <Link
        href={`/products/${product.id}`}
        className="group flex overflow-hidden rounded-md border bg-card shadow-sm transition hover:border-amber-400 hover:shadow-md"
      >
        <div className="relative aspect-square w-32 shrink-0 overflow-hidden bg-muted sm:w-44">
          <Image
            src={mainSrc}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 128px, 176px"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />

          {!inStock ? (
            <Badge className="absolute left-2 top-2 rounded-sm bg-slate-700 text-[11px] text-white">
              Out of stock
            </Badge>
          ) : (
            <Badge className="absolute left-2 top-2 rounded-sm bg-amber-500 text-[11px] text-slate-950">
              In stock
            </Badge>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-center justify-between gap-2">
            {product.category ? (
              <span className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {product.category}
              </span>
            ) : (
              <span />
            )}
          </div>

          <h3 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">
            {product.name}
          </h3>

          <p className="text-xs text-muted-foreground">
            Code {product.code} · per {productUnitLabel(product)}
          </p>

          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-2">
            <div>
              {price !== null ? (
                <p className="font-bold text-slate-900">
                  {formatPrice(price)}{" "}
                  <span className="text-xs font-medium text-muted-foreground">
                    / {productUnitLabel(product)}
                  </span>
                </p>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">
                  Price on request
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                onClick={handleToggleWishlist}
                className={cn(
                  "rounded-md border p-2 transition",
                  wishlisted
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-slate-200 text-slate-500 hover:text-amber-700"
                )}
              >
                <Heart
                  className={`h-4 w-4 transition ${wishlisted ? "fill-amber-600 text-amber-600" : ""}`}
                />
              </button>

              <Button
                size="sm"
                onClick={handleAddToCart}
                disabled={!inStock || !cartItem}
                className="gap-1.5"
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4" /> Added
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" /> Add to cart
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-md border bg-card shadow-sm transition hover:border-amber-400 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden border-b bg-muted">
        <Image
          src={mainSrc}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
        />

        {!inStock ? (
          <Badge className="absolute left-2 top-2 rounded-sm bg-slate-700 text-[11px] text-white">
            Out of stock
          </Badge>
        ) : (
          <Badge className="absolute left-2 top-2 rounded-sm bg-amber-500 text-[11px] text-slate-950">
            In stock
          </Badge>
        )}

        <button
          type="button"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          onClick={handleToggleWishlist}
          className="absolute right-2 top-2 rounded-sm bg-white/90 p-2 text-slate-500 shadow-sm backdrop-blur transition hover:text-amber-700"
        >
          <Heart
            className={`h-4 w-4 transition ${wishlisted ? "fill-amber-600 text-amber-600" : ""}`}
          />
        </button>

        {cartItem && inStock && (
          <button
            type="button"
            onClick={handleAddToCart}
            aria-label={`Add ${product.name} to cart`}
            className={cn(
              "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-slate-900/95 py-2.5 text-xs font-bold uppercase tracking-wide text-white backdrop-blur transition-colors hover:bg-amber-600 hover:text-slate-950 sm:translate-y-full sm:group-hover:translate-y-0"
            )}
          >
            {added ? (
              <>
                <Check className="h-3.5 w-3.5" /> Added
              </>
            ) : (
              <>
                <ShoppingBag className="h-3.5 w-3.5" /> Add to cart
              </>
            )}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-center justify-between gap-2">
          {product.category ? (
            <span className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {product.category}
            </span>
          ) : (
            <span />
          )}
        </div>

        <h3 className="line-clamp-1 text-sm font-semibold leading-snug">
          {product.name}
        </h3>

        <p className="text-xs text-muted-foreground">
          Code {product.code} · per {productUnitLabel(product)}
        </p>

        <div className="mt-auto pt-2">
          {price !== null ? (
            <p className="font-bold text-slate-900">
              {formatPrice(price)}{" "}
              <span className="text-xs font-medium text-muted-foreground">
                / {productUnitLabel(product)}
              </span>
            </p>
          ) : (
            <p className="text-sm font-medium text-muted-foreground">
              Price on request
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton({ layout = "grid" }: { layout?: Layout }) {
  if (layout === "list") {
    return (
      <div className="flex animate-pulse overflow-hidden rounded-md border bg-card">
        <div className="aspect-square w-32 shrink-0 bg-slate-200 sm:w-44" />
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="h-3 w-24 rounded bg-slate-200" />
          <div className="h-4 w-3/4 rounded bg-slate-200" />
          <div className="h-3 w-1/2 rounded bg-slate-200" />
          <div className="mt-auto h-9 w-32 rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-md border bg-card">
      <div className="aspect-[4/3] w-full bg-slate-200" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-16 rounded bg-slate-200" />
        <div className="h-4 w-full rounded bg-slate-200" />
        <div className="h-4 w-2/3 rounded bg-slate-200" />
        <div className="h-5 w-24 rounded bg-slate-200" />
      </div>
    </div>
  );
}