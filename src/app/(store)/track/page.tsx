"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, PackageSearch, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/store-front";

type TrackedOrder = {
  orderNumber: string;
  customerName: string;
  phone: string;
  status: string;
  total: number;
  createdAt: string;
  address: string;
  items: {
    id: string;
    productName: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
  }[];
  statusEvents: {
    id: string;
    status: string;
    note: string | null;
    at: string;
  }[];
};

const STATUS_FLOW = [
  "PLACED",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
];

const STATUS_LABELS: Record<string, string> = {
  PLACED: "Order placed",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  PLACED: "We received your order and will call you shortly.",
  CONFIRMED: "Your order was confirmed over the phone.",
  PROCESSING: "We are preparing your order.",
  SHIPPED: "Your order is on its way to you.",
  DELIVERED: "Delivered — thank you for shopping with us!",
  CANCELLED: "This order was cancelled.",
};

function TrackPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orderNumber, setOrderNumber] = useState(
    searchParams.get("order") ?? ""
  );
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const orderParam = searchParams.get("order");
    if (orderParam) setOrderNumber(orderParam);
  }, [searchParams]);

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTouched(true);

    try {
      const res = await fetch(
        `/api/store/orders/${encodeURIComponent(orderNumber)}?phone=${encodeURIComponent(phone)}`
      );
      const data = await res.json();

      if (!data.success) {
        setOrder(null);
        setError(data.error || "Order not found");
        return;
      }

      setOrder(data.data);
      router.replace(`/track?order=${data.data.orderNumber}`, { scroll: false });
    } catch {
      setOrder(null);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const flowIndex = order
    ? STATUS_FLOW.indexOf(order.status)
    : -1;
  const cancelled = order?.status === "CANCELLED";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="text-center">
        <PackageSearch className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          Track your order
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your order number and the phone number you ordered with.
        </p>
      </div>

      <form
        onSubmit={handleTrack}
        className="grid gap-3 rounded-xl border bg-card p-5 sm:grid-cols-[1fr_1fr_auto]"
      >
        <div>
          <Label htmlFor="order-number">Order number</Label>
          <Input
            id="order-number"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="mt-1"
            placeholder="CM-XXXXXX"
            required
          />
        </div>
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
        <Button
          type="submit"
          className="mt-0 rounded-full sm:mt-6"
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Track
        </Button>
      </form>

      {touched && !loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          {error}
        </div>
      )}

      {order && !loading && (
        <div className="space-y-5">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-lg font-bold">{order.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  Placed on{" "}
                  {new Date(order.createdAt).toLocaleString()} · Delivering to{" "}
                  {order.address}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  cancelled
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
            </div>

            {/* Progress steps */}
            {cancelled ? (
              <div className="mt-5 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                <XCircle className="h-5 w-5" />
                {STATUS_DESCRIPTIONS.CANCELLED}
              </div>
            ) : (
              <ol className="mt-6 grid grid-cols-5 gap-1">
                {STATUS_FLOW.map((status, index) => {
                  const done = index <= flowIndex;
                  const isLast = index === STATUS_FLOW.length - 1;

                  return (
                    <li key={status} className="relative">
                      <div className="flex flex-col items-center text-center">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                            done ? "bg-green-600" : "bg-slate-200"
                          }`}
                        >
                          {done ? (
                            index === flowIndex && index < flowIndex ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              index + 1
                            )
                          ) : (
                            index + 1
                          )}
                        </span>
                        <span
                          className={`mt-1.5 text-[10px] leading-tight ${
                            done ? "font-semibold text-slate-900" : "text-slate-400"
                          }`}
                        >
                          {STATUS_LABELS[status]}
                        </span>
                      </div>

                      {!isLast && (
                        <span
                          className={`absolute left-1/2 top-3 h-0.5 w-full ${
                            index < flowIndex ? "bg-green-600" : "bg-slate-200"
                          }`}
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
            )}

            <p className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {cancelled
                ? STATUS_DESCRIPTIONS.CANCELLED
                : STATUS_DESCRIPTIONS[order.status] ??
                  "Your order is being processed."}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold">Order details</h2>
            {order.statusEvents.length > 0 && (
                <ul className="mt-4 space-y-2 border-l-2 border-slate-100 pl-4">
                {[...order.statusEvents].reverse().map((event) => (
                  <li
                    key={event.id}
                    className="relative text-sm"
                  >
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-amber-500" />
                    <span className="font-medium">
                      {STATUS_LABELS[event.status] ?? event.status}
                    </span>
                    {event.note && (
                      <span className="text-muted-foreground">
                        {" "}
                        — {event.note}
                      </span>
                    )}
                    <span className="block text-xs text-muted-foreground">
                      {new Date(event.at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <ul className="mt-4 space-y-2 border-t pt-4">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between text-sm"
                >
                  <span>
                    {item.productName}
                    {item.variantName ? ` · ${item.variantName}` : ""} ×{" "}
                    {item.quantity}
                  </span>
                  <span className="font-medium">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex justify-between border-t pt-3 text-sm font-bold">
              <span>Total (cash on delivery)</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            Need help?{" "}
            <Link href="/account" className="text-amber-700 underline">
              View your account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <TrackPageInner />
    </Suspense>
  );
}