"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWishlist } from "@/context/wishlist-context";
import {
  effectivePrice,
  formatPrice,
  isInStock,
  placeholderImage,
  type StoreProduct,
} from "@/lib/store-front";

export function ProductCard({ product }: { product: StoreProduct }) {
  const router = useRouter();
  const { loggedIn, wishlistedIds, toggle } = useWishlist();

  const inStock = isInStock(product);
  const totalStock = product.variants.reduce(
    (sum, v) => sum + v.stockQuantity,
    0
  );
  const price = effectivePrice(product);
  const wishlisted = wishlistedIds.has(product.id);

  const mainSrc = product.imageUrl || placeholderImage(product.name);
  const hoverSrc =
    product.imageUrl2 || placeholderImage(`${product.name} packing`);

  async function handleToggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!loggedIn) {
      router.push("/account");
      return;
    }

    await toggle(product.id);
  }

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        <Image
          src={mainSrc}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition duration-300 group-hover:opacity-0"
        />
        <Image
          src={hoverSrc}
          alt={`${product.name} — bottle and packing`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover opacity-0 transition duration-300 group-hover:opacity-100"
        />

        {!inStock ? (
          <Badge className="absolute left-2 top-2 bg-red-600 text-[11px]">
            Out of stock
          </Badge>
        ) : totalStock <= 5 ? (
          <Badge className="absolute left-2 top-2 bg-amber-500 text-[11px] text-white">
            Only {totalStock} left
          </Badge>
        ) : (
          <Badge className="absolute left-2 top-2 bg-green-600 text-[11px]">
            In stock
          </Badge>
        )}

        <button
          type="button"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          onClick={handleToggleWishlist}
          className="absolute right-2 top-2 rounded-full bg-white/90 p-2 text-slate-500 shadow-sm backdrop-blur transition hover:text-rose-600"
        >
          <Heart
            className={`h-4 w-4 transition ${wishlisted ? "fill-rose-600 text-rose-600" : ""}`}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {product.category && (
          <Badge
            variant="secondary"
            className="w-fit text-[10px] uppercase tracking-wide"
          >
            {product.category}
          </Badge>
        )}

        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
          {product.name}
        </h3>

        <p className="line-clamp-2 text-xs text-muted-foreground">
          {product.description}
        </p>

        <div className="mt-auto pt-3">
          {price !== null && (
            <p className="text-base font-bold text-amber-700">
              From {formatPrice(price)}
            </p>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {product.variants.length > 0 && (
              <span>
                {product.variants.length} size
                {product.variants.length > 1 ? "s" : ""}
              </span>
            )}
            {inStock && <span className="text-green-700">In stock</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}