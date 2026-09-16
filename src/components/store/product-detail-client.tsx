"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { Carousel } from "@/components/store/carousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/cart-context";
import { useWishlist } from "@/context/wishlist-context";
import {
  effectivePrice,
  formatPrice,
  isInStock,
  maybeInt,
  placeholderImage,
  productUnitLabel,
  type StoreProduct,
  type StoreVariant,
} from "@/lib/store-front";

function StockBadge({ inStock }: { inStock: boolean }) {
  return inStock ? (
    <span className="flex items-center gap-1 text-sm font-medium text-green-700">
      <Check className="h-4 w-4" /> In stock
    </span>
  ) : (
    <span className="flex items-center gap-1 text-sm font-medium text-red-600">
      <span className="h-2 w-2 rounded-full bg-red-600" /> Out of stock
    </span>
  );
}

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

export function ProductDetailClient({ product }: { product: StoreProduct }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { loggedIn, wishlistedIds, toggle } = useWishlist();

  const [selectedVariant, setSelectedVariant] = useState<StoreVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const wishlisted = wishlistedIds.has(product.id);

  const currentVariant =
    product.variants.find((v) => v.id === selectedVariant?.id) ??
    product.variants[0] ??
    null;
  const unitPrice = effectivePrice(product);
  const inStock = isInStock(product);

  const images: React.ReactNode[] = [];
  if (currentVariant?.imageUrl) {
    images.push(
      <Image
        key="variant"
        src={currentVariant.imageUrl}
        alt={product.name}
        width={640}
        height={480}
        className="aspect-[4/3] w-full object-cover"
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
        height={480}
        className="aspect-[4/3] w-full object-cover"
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
        alt={`${product.name} — additional photo`}
        width={640}
        height={480}
        className="aspect-[4/3] w-full object-cover"
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
        height={480}
        className="aspect-[4/3] w-full object-cover"
      />
    );
  }

  function handleAddToCart() {
    if (!product) return;

    addItem(
      {
        id: currentVariant?.id ?? product.id,
        productId: product.id,
        variantId: currentVariant?.id ?? null,
        sku: currentVariant?.sku ?? product.code,
        productName: product.name,
        variantName: currentVariant?.name ?? null,
        unit: currentVariant?.sizeUnit ?? product.unit,
        unitPrice: unitPrice ?? 0,
        imageUrl: currentVariant?.imageUrl ?? product.imageUrl,
        stockQuantity: Number(product.stockQuantity),
      },
      quantity
    );

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const specRows: Array<{ label: string; value: string }> = [
    { label: "Product code", value: product.code },
    { label: "Category", value: product.category ?? "—" },
    { label: "Unit", value: product.unit.toLowerCase() },
  ];

  if (product.subcategory) {
    specRows.push({ label: "Subcategory", value: product.subcategory });
  }
  if (product.trades.length > 0) {
    specRows.push({ label: "Trade", value: product.trades.join(", ") });
  }
  if (product.stockQuantity > 0) {
    specRows.push({
      label: "Available",
      value: `${formatQuantity(product.stockQuantity)} ${productUnitLabel(product)}`,
    });
  }

  return (
    <div className="space-y-8">
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to all products
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <Carousel
            slides={images}
            className="overflow-hidden rounded-md border max-h-[280px] sm:max-h-none"
            autoAdvanceMs={images.length > 1 ? 5000 : undefined}
            showArrows={images.length > 1}
          />

          {product.variants.length > 0 && (
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
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                    currentVariant?.id === v.id
                      ? "border-amber-500 bg-amber-50 text-amber-900"
                      : "bg-white text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {maybeInt(v.sizeValue)} {v.sizeUnit.toLowerCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              {product.category && (
                <Badge
                  variant="secondary"
                  className="w-fit rounded-sm text-[11px] uppercase tracking-wide"
                >
                  {product.category}
                </Badge>
              )}

              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                {product.name}
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Code {product.code}
              </p>
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
              className={`rounded-md border p-2.5 transition ${
                wishlisted
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "bg-white text-slate-500 hover:border-amber-300 hover:text-amber-700"
              }`}
            >
              <Heart
                className={`h-5 w-5 ${wishlisted ? "fill-amber-600 text-amber-600" : ""}`}
              />
            </button>
          </div>

          {unitPrice !== null ? (
            <p className="font-bold text-slate-900">
              <span className="text-3xl">{formatPrice(unitPrice)}</span>{" "}
              <span className="text-sm font-medium text-muted-foreground">
                / {currentVariant ? currentVariant.sizeUnit.toLowerCase() : productUnitLabel(product)}
              </span>
            </p>
          ) : (
            <p className="text-sm font-medium text-muted-foreground">
              Price on request
            </p>
          )}

          <StockBadge inStock={inStock} />

          {product.description && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {product.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-md border">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-2.5 text-slate-600 hover:text-slate-900 disabled:opacity-40"
                disabled={!inStock}
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                aria-label="Quantity"
                type="number"
                min={1}
                step={product.unit === "KG" || product.unit === "LITER" ? 0.5 : 1}
                value={quantity}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (Number.isFinite(next) && next > 0) {
                    setQuantity(
                      Math.min(next, Number(product.stockQuantity) || 9999)
                    );
                  }
                }}
                className="w-16 border-x bg-transparent py-2 text-center text-sm font-semibold outline-none"
              />
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() =>
                  setQuantity((q) =>
                    Math.min(
                      q + (product.unit === "KG" || product.unit === "LITER" ? 0.5 : 1),
                      Number(product.stockQuantity) || 9999
                    )
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
              className="flex-1 rounded-md sm:flex-none"
              onClick={handleAddToCart}
              disabled={!inStock}
            >
              {added ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <ShoppingCart className="mr-2 h-4 w-4" />
              )}
              {added ? "Added to cart" : inStock ? "Add to cart" : "Out of stock"}
            </Button>
          </div>

          <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <Truck className="h-5 w-5 shrink-0 text-amber-700" />
            Cash on delivery — pay when your order arrives.
          </div>

          <button
            onClick={() => router.push("/cart")}
            className="mt-1 w-fit text-sm font-semibold text-amber-700 underline"
          >
            Go to cart
          </button>
        </div>
      </div>

      <section className="rounded-md border">
        <h2 className="border-b bg-slate-50 px-4 py-3 text-sm font-bold uppercase tracking-wide">
          Product details
        </h2>
        <dl className="divide-y">
          {specRows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-2 gap-4 px-4 py-2.5 text-sm"
            >
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
