"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, LogOut, Package, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWishlist } from "@/context/wishlist-context";
import {
  effectivePrice,
  formatPrice,
  isInStock,
  placeholderImage,
  productUnitLabel,
  type StoreProduct,
} from "@/lib/store-front";

type Customer = {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  isStaff: boolean;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: { id: string; productName: string; quantity: number }[];
};

type WishlistItem = {
  id: string;
  product: StoreProduct;
};

const STATUS_LABELS: Record<string, string> = {
  PLACED: "Placed",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default function AccountPage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { refresh: refreshWishlist, toggle: toggleProduct } = useWishlist();

  // login form
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  // register form
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadMe() {
    const res = await fetch("/api/store/customers");
    if (!res.ok) {
      setCustomer(null);
      return;
    }
    const data = await res.json();
    if (data.success) {
      setCustomer(data.data);
      const ordersRes = await fetch("/api/store/orders");
      const ordersData = await ordersRes.json();
      if (ordersData.success) setOrders(ordersData.data);

      const wishRes = await fetch("/api/store/wishlist");
      const wishData = await wishRes.json();
      if (wishData.success) setWishlist(wishData.data);

      refreshWishlist();
    }
  }

  useEffect(() => {
    loadMe().finally(() => setLoading(false));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/store/customers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: loginIdentifier,
          password: loginPassword,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Login failed");
        return;
      }

      await loadMe();
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/store/customers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          username: regUsername,
          email: regEmail,
          phone: regPhone,
          password: regPassword,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Registration failed");
        return;
      }

      await loadMe();
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/store/customers", { method: "POST" });
    setCustomer(null);
    setOrders([]);
    setWishlist([]);
    refreshWishlist();
  }

  async function removeFromWishlist(productId: string) {
    await toggleProduct(productId);
    setWishlist((prev) => prev.filter((item) => item.product.id !== productId));
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <User className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-3 text-2xl font-bold tracking-tight">My account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Log in or create an account to manage your orders.
          </p>
        </div>

        <div className="flex rounded-full border bg-slate-50 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-full py-2 font-medium transition ${
              mode === "login" ? "bg-white shadow-sm" : "text-muted-foreground"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 rounded-full py-2 font-medium transition ${
              mode === "register" ? "bg-white shadow-sm" : "text-muted-foreground"
            }`}
          >
            Create account
          </button>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <Label htmlFor="identifier">Email, phone or username</Label>
              <Input
                id="identifier"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full rounded-full"
              disabled={submitting}
            >
              {submitting ? "Logging in…" : "Log in"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <Label htmlFor="reg-name">Full name</Label>
              <Input
                id="reg-name"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="reg-username">Username</Label>
                <Input
                  id="reg-username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="reg-phone">Phone</Label>
                <Input
                  id="reg-phone"
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="reg-email">Email (optional)</Label>
              <Input
                id="reg-email"
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="reg-password">Password</Label>
              <Input
                id="reg-password"
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="mt-1"
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full rounded-full"
              disabled={submitting}
            >
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Hello, {customer.name || customer.username}
            {customer.isStaff && (
              <span className="ml-2 inline-block translate-y-[-2px] rounded-full bg-slate-900 px-2.5 py-0.5 align-middle text-[11px] font-semibold text-white">
                Staff account
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[customer.email, customer.phone].filter(Boolean).join(" · ")}
          </p>
        </div>

        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Package className="h-5 w-5 text-amber-600" />
          Your orders
        </h2>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            You haven&apos;t placed any orders yet.{" "}
            <Link href="/products" className="text-amber-700 underline">
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"
              >
                <div>
                  <p className="text-sm font-semibold">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString()} ·{" "}
                    {order.items.reduce((sum, i) => sum + i.quantity, 0)} item
                    {order.items.reduce((sum, i) => sum + i.quantity, 0) === 1
                      ? ""
                      : "s"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      order.status === "CANCELLED"
                        ? "bg-red-100 text-red-700"
                        : order.status === "DELIVERED"
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                  <span className="text-sm font-bold">
                    {formatPrice(order.total)}
                  </span>
                  <Link
                    href={`/track?order=${order.orderNumber}`}
                    className="text-xs font-medium text-amber-700 underline"
                  >
                    Track
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Heart className="h-5 w-5 text-rose-500" />
          Your wishlist
        </h2>

        {wishlist.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            <Heart className="mx-auto mb-3 h-8 w-8 opacity-40" />
            Your wishlist is empty. Tap the heart on any product to save it
            here.{" "}
            <Link href="/products" className="text-amber-700 underline">
              Browse products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {wishlist.map((item) => {
              const inStock = isInStock(item.product);
              const price = effectivePrice(item.product);

              return (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-md border bg-card p-3"
                >
                  <Link
                    href={`/products/${item.product.id}`}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted"
                  >
                    <Image
                      src={
                        item.product.imageUrl ||
                        placeholderImage(item.product.name)
                      }
                      alt={item.product.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={`/products/${item.product.id}`}
                      className="line-clamp-2 text-sm font-semibold leading-snug hover:underline"
                    >
                      {item.product.name}
                    </Link>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      per {productUnitLabel(item.product)}
                    </p>

                    <p className="text-xs font-bold text-amber-700">
                      {price !== null ? formatPrice(price) : "Price on request"}
                    </p>

                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span
                        className={`text-[11px] font-semibold ${
                          inStock ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {inStock ? "In stock" : "Out of stock"}
                      </span>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-3 py-1 text-xs"
                          asChild
                        >
                          <Link href={`/products/${item.product.id}`}>View</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-2 py-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => removeFromWishlist(item.product.id)}
                          aria-label="Remove from wishlist"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}