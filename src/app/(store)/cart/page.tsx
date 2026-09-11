"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/cart-context";
import { formatPrice, placeholderImage } from "@/lib/store-front";

export default function CartPage() {
  const { items, subtotal, updateQty, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <div className="rounded-full bg-amber-50 p-5">
          <ShoppingBag className="h-10 w-10 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Browse our fragrances and add something you like to your cart.
        </p>
        <Link
          href="/products"
          className="rounded-full bg-slate-900 px-8 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Your cart</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.variantId}
              className="flex gap-4 rounded-xl border bg-card p-3"
            >
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={item.imageUrl || placeholderImage(item.productName)}
                  alt={item.productName}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>

              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/products/${item.productId}`}
                      className="text-sm font-semibold hover:underline"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {item.variantName} · {item.sizeLabel}
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => removeItem(item.variantId)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center rounded-full border">
                    <button
                      type="button"
                      aria-label="Decrease"
                      onClick={() => updateQty(item.variantId, item.quantity - 1)}
                      className="p-1.5 text-slate-600 hover:text-slate-900"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase"
                      onClick={() => updateQty(item.variantId, item.quantity + 1)}
                      className="p-1.5 text-slate-600 hover:text-slate-900"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="text-sm font-bold">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="h-fit rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Order summary</h2>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd className="font-medium">Calculated at checkout</dd>
            </div>
          </dl>

          <p className="mt-4 flex justify-between border-t pt-3 text-base font-bold">
            <span>Total</span>
            <span>{formatPrice(subtotal)}</span>
          </p>

          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Cash on delivery — pay when your order arrives.
          </p>

          <Link href="/checkout" className="mt-4 block">
            <Button size="lg" className="w-full rounded-full">
              Checkout
            </Button>
          </Link>

          <Link
            href="/products"
            className="mt-3 block text-center text-sm text-muted-foreground underline"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}