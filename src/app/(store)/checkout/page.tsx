"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/context/cart-context";
import { formatPrice, formatQuantity, placeholderImage } from "@/lib/store-front";
import { computeShipping } from "@/lib/money";

type Customer = {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  isStaff: boolean;
};

type PlacedOrder = {
  orderNumber: string;
  total: number;
  paymentMethod: string;
};

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();

  const [customer, setCustomer] = useState<Customer | null>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  const [showLogin, setShowLogin] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [shippingConfig, setShippingConfig] = useState({
    fee: 0,
    freeThreshold: 0,
  });

  const empty = items.length === 0;

  useEffect(() => {
    fetch("/api/store/settings")
      .then(async (r) => {
        if (!r.ok) return null;
        const data = await r.json();
        return data.success ? data.data : null;
      })
      .then((settings) => {
        if (settings) {
          setShippingConfig({
            fee: Number(settings.shippingFee) || 0,
            freeThreshold: Number(settings.freeShippingThreshold) || 0,
          });
        }
      })
      .catch(() => {});

    fetch("/api/store/customers")
      .then(async (r) => {
        if (!r.ok) return null;
        const data = await r.json();
        return data.success ? (data.data as Customer) : null;
      })
      .then((c) => {
        if (c) {
          setCustomer(c);
          setName(c.name || "");
          setEmail(c.email || "");
          setPhone(c.phone || "");
          setAddress(c.address || "");
          setCity(c.city || "");
          setUsername(c.username);
        }
      })
      .catch(() => {});
  }, []);

  const shipping = computeShipping(
    subtotal,
    shippingConfig.fee,
    shippingConfig.freeThreshold
  );
  const total = subtotal + shipping;

  const canPlace = useMemo(() => {
    if (customer) {
      return Boolean(
        name.trim() && phone.trim() && address.trim()
      );
    }
    return Boolean(
      name.trim() &&
        username.trim() &&
        password.trim() &&
        phone.trim() &&
        (email.trim() || phone.trim()) &&
        address.trim()
    );
  }, [customer, name, username, password, email, phone, address]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");

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
        setLoginError(data.error || "Login failed");
        return;
      }

      const c = data.data as Customer;
      setCustomer(c);
      setName(c.name || "");
      setEmail(c.email || "");
      setPhone(c.phone || "");
      setAddress(c.address || "");
      setCity(c.city || "");
      setUsername(c.username);
      setShowLogin(false);
      setLoginError("");
    } catch {
      setLoginError("Something went wrong");
    }
  }

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPlacing(true);

    try {
      const res = await fetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          useLoggedIn: Boolean(customer),
          customer: {
            name: name.trim(),
            username: username.trim(),
            password,
            email: email.trim() || null,
            phone: phone.trim(),
            address: address.trim(),
            city: city.trim() || null,
            notes: notes.trim() || null,
          },
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            sku: i.sku,
            productName: i.productName,
            variantName: i.variantName,
            imageUrl: i.imageUrl,
            unit: i.unit,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
          })),
          shipping,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Order could not be placed");
        return;
      }

      clear();
      setPlacedOrder(data.data.order);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPlacing(false);
    }
  }

  if (placedOrder) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <CheckCircle2 className="h-14 w-14 text-green-600" />
        <h1 className="text-2xl font-bold">Order placed!</h1>
        <p className="text-sm text-muted-foreground">
          Your order <span className="font-semibold text-slate-900">{placedOrder.orderNumber}</span>{" "}
          has been received. We will call you on the phone number you provided
          to confirm your delivery.
        </p>

        <div className="w-full rounded-xl border bg-card p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order total</span>
            <span className="font-bold">{formatPrice(placedOrder.total)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-muted-foreground">Payment</span>
            <span className="font-medium">Cash on delivery</span>
          </div>
        </div>

        <Link
          href={`/track?order=${placedOrder.orderNumber}`}
          className="rounded-full bg-slate-900 px-8 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Track your order
        </Link>
        <Link
          href="/products"
          className="text-sm text-muted-foreground underline"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>

      {empty && !placing ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Your cart is empty.{" "}
          <Link href="/products" className="text-amber-700 underline">
            Start shopping
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handlePlaceOrder}
          className="grid gap-6 lg:grid-cols-[1fr_320px]"
        >
          <div className="space-y-6">
            {/* Account */}
            <section className="rounded-xl border bg-card p-5">
              <h2 className="font-semibold">
                {customer ? "Your account" : "Create your account"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {customer ? (
                  <>
                    Signed in as {customer.name || customer.username}
                    {customer.isStaff && (
                      <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Staff account
                      </span>
                    )}
                  </>
                ) : (
                  "We create your account with this order so you can track it later."
                )}
              </p>

              {!customer && (
                <div className="mt-3">
                  {showLogin ? (
                    <form onSubmit={handleLogin} className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="login-identifier">
                            Email or phone or username
                          </Label>
                          <Input
                            id="login-identifier"
                            value={loginIdentifier}
                            onChange={(e) =>
                              setLoginIdentifier(e.target.value)
                            }
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
                            onChange={(e) =>
                              setLoginPassword(e.target.value)
                            }
                            className="mt-1"
                            required
                          />
                        </div>
                      </div>

                      {loginError && (
                        <p className="text-xs text-red-600">{loginError}</p>
                      )}

                      <Button type="submit" variant="outline">
                        Log in
                      </Button>
                      <button
                        type="button"
                        className="ml-2 text-xs text-muted-foreground underline"
                        onClick={() => setShowLogin(false)}
                      >
                        I&apos;m new here — continue as new
                      </button>
                    </form>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="mt-1"
                          placeholder="e.g. zain"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="mt-1"
                          placeholder="At least 6 characters"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {showLogin && customer === null && (
                <p className="mt-2 text-right text-xs">
                  <button
                    type="button"
                    onClick={() => setShowLogin(false)}
                    className="text-amber-700 underline"
                  >
                    Create a new account instead
                  </button>
                </p>
              )}
              {!showLogin && customer === null && (
                <p className="mt-2 text-xs">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setShowLogin(true)}
                    className="text-amber-700 underline"
                  >
                    Log in
                  </button>
                </p>
              )}
            </section>

            {/* Delivery details */}
            <section className="rounded-xl border bg-card p-5">
              <h2 className="font-semibold">Delivery details</h2>

              <div className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="phone">Phone number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1"
                      placeholder="03xxxxxxxxx"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email (optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Delivery address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1"
                    placeholder="House, street, area, city"
                    required
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Order notes (optional)</Label>
                    <Input
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Summary */}
          <aside className="h-fit rounded-xl border bg-card p-5">
            <h2 className="font-semibold">Your order</h2>

            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 text-sm">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    <Image
                      src={(item.imageUrl && item.imageUrl !== "null") ? item.imageUrl : placeholderImage(item.productName)}
                      alt={item.productName}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium leading-tight">
                      {item.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatQuantity(item.quantity)} {item.unit.toLowerCase()}
                      {item.variantName ? ` · ${item.variantName}` : ""}
                    </p>
                  </div>
                  <p className="font-medium">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <dl className="mt-4 space-y-2 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="font-medium">
                  {shipping === 0 ? "Free" : formatPrice(shipping)}
                </dd>
              </div>
              {shippingConfig.freeThreshold > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Free delivery over</dt>
                  <dd className="font-medium">
                    {formatPrice(shippingConfig.freeThreshold)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd>{formatPrice(total)}</dd>
              </div>
            </dl>

            {shipping === 0 && shippingConfig.fee > 0 && (
              <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
                You qualify for free delivery.
              </p>
            )}

            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Pay in cash when your order arrives.
            </p>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}

            <Button
              size="lg"
              className="mt-4 w-full rounded-md"
              disabled={!canPlace || placing}
            >
              {placing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {placing ? "Placing order…" : `Place order · ${formatPrice(total)}`}
            </Button>
          </aside>
        </form>
      )}
    </div>
  );
}