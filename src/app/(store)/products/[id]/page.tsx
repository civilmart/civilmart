"use client";

import { useEffect, use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  Heart,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { Carousel } from "@/components/store/carousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/cart-context";
import { useWishlist } from "@/context/wishlist-context";
import {
  effectivePrice,
  formatPrice,
  maybeInt,
  placeholderImage,
  sizeLabel,
  type StoreProduct,
  type StoreVariant,
} from "@/lib/store-front";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { addItem } = useCart();
  const { loggedIn, wishlistedIds, toggle } = useWishlist();

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVariant, setSelectedVariant] = useState<StoreVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/store/products/${id}`);
        const data = await res.json();

        if (!cancelled) {
          if (data.success) {
            setProduct(data.data);
          } else {
            setError(data.error || "Product not found");
          }
        }
      } catch {
        if (!cancelled) setError("Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    setSelectedVariant((prev) => prev ?? product?.variants[0] ?? null);
  }, [product]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-sm text-muted-foreground">
          {error || "Product not found"}
        </p>
        <Link
          href="/products"
          className="text-sm font-medium text-amber-700 underline"
        >
          Back to shop
        </Link>
      </div>
    );
  }

  const wishlisted = wishlistedIds.has(product.id);

  const currentVariant = selectedVariant ?? product.variants[0] ?? null;
  const unitPrice = currentVariant?.price ?? effectivePrice(product);
  const inStock = currentVariant
    ? currentVariant.stockQuantity > 0
    : product.variants.some((v) => v.stockQuantity > 0);

  const images: React.ReactNode[] = [];
  if (currentVariant?.imageUrl) {
    images.push(
      <Image
        key="variant"
        src={currentVariant.imageUrl}
        alt={product.name}
        width={640}
        height={640}
        className="aspect-square w-full object-cover"
      />
    );
  }
  if (product.imageUrl && product.imageUrl !== currentVariant?.imageUrl) {
    images.push(
      <Image
        key="product"
        src={product.imageUrl}
        alt={product.name}
        width={640}
        height={640}
        className="aspect-square w-full object-cover"
      />
    );
  }
  if (
    product.imageUrl2 &&
    product.imageUrl2 !== currentVariant?.imageUrl &&
    product.imageUrl2 !== product.imageUrl
  ) {
    images.push(
      <Image
        key="product2"
        src={product.imageUrl2}
        alt={`${product.name} — bottle and packing`}
        width={640}
        height={640}
        className="aspect-square w-full object-cover"
      />
    );
  }
  if (images.length === 0) {
    images.push(
      <Image
        key="placeholder"
        src={placeholderImage(product.name)}
        alt={product.name}
        width={640}
        height={640}
        className="aspect-square w-full object-cover"
      />
    );
  }

  function handleAddToCart() {
    if (!currentVariant || !product) return;

    addItem(
      {
        variantId: currentVariant.id,
        productId: product.id,
        sku: currentVariant.sku,
        productName: product.name,
        variantName: currentVariant.name,
        sizeLabel: sizeLabel(currentVariant),
        unitPrice: currentVariant.price ?? product.price ?? 0,
        imageUrl: currentVariant.imageUrl ?? product.imageUrl,
        stockQuantity: currentVariant.stockQuantity,
      },
      quantity
    );

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="space-y-8">
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to shop
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <Carousel
            slides={images}
            className="overflow-hidden rounded-2xl border"
            autoAdvanceMs={images.length > 1 ? 5000 : undefined}
            showArrows={images.length > 1}
          />

          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setSelectedVariant(v);
                  setQuantity(1);
                  setAdded(false);
                }}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  currentVariant?.id === v.id
                    ? "border-amber-500 bg-amber-50 text-amber-800"
                    : "bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {maybeInt(v.sizeValue)} {v.sizeUnit.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              {product.category && (
                <Badge
                  variant="secondary"
                  className="w-fit text-[11px] uppercase tracking-wide"
                >
                  {product.category}
                </Badge>
              )}

              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                {product.name}
              </h1>
            </div>

            <button
              type="button"
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              onClick={async () => {
                if (!loggedIn) {
                  router.push("/account");
                  return;
                }
                await toggle(product.id);
              }}
              className={`rounded-full border p-2.5 transition ${
                wishlisted
                  ? "border-rose-200 bg-rose-50 text-rose-600"
                  : "bg-white text-slate-500 hover:border-rose-300 hover:text-rose-600"
              }`}
            >
              <Heart
                className={`h-5 w-5 ${wishlisted ? "fill-rose-600 text-rose-600" : ""}`}
              />
            </button>
          </div>

          {currentVariant && (
            <p className="text-sm text-muted-foreground">
              {sizeLabel(currentVariant)} · SKU {currentVariant.sku}
            </p>
          )}

          {unitPrice !== null ? (
            <p className="text-2xl font-bold text-amber-700">
              {formatPrice(unitPrice)}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Price on request</p>
          )}

          <div className="flex items-center gap-2 text-sm">
            {inStock ? (
              <span className="flex items-center gap-1 text-green-700">
                <Check className="h-4 w-4" /> In stock
              </span>
            ) : (
              <span className="text-red-600">Sold out</span>
            )}
          </div>

          {product.description && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {product.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-2.5 text-slate-600 hover:text-slate-900 disabled:opacity-40"
                disabled={!inStock}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-semibold">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() =>
                  setQuantity((q) =>
                    Math.min(currentVariant?.stockQuantity ?? 99, q + 1)
                  )
                }
                className="p-2.5 text-slate-600 hover:text-slate-900 disabled:opacity-40"
                disabled={!inStock}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <Button
              size="lg"
              className="flex-1 rounded-full sm:flex-none"
              onClick={handleAddToCart}
              disabled={!inStock}
            >
              {added ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <ShoppingBag className="mr-2 h-4 w-4" />
              )}
              {added ? "Added to cart" : inStock ? "Add to cart" : "Sold out"}
            </Button>
          </div>

          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Pay in cash when your order arrives. Delivery nationwide.
          </div>

          <button
            onClick={() => router.push("/cart")}
            className="mt-1 w-fit text-sm font-medium text-amber-700 underline"
          >
            Go to cart
          </button>
        </div>
      </div>
    </div>
  );
}