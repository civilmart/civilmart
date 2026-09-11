"use client";

import { useEffect, useState } from "react";
import { Loader2, Package, Phone, Receipt, RefreshCw, StickyNote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/store-front";

type OrderItem = {
  id: string;
  sku: string;
  productName: string;
  variantName: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
};

type StatusEvent = {
  id: string;
  status: string;
  note: string | null;
  at: string;
};

type StoreOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  email: string | null;
  address: string;
  city: string | null;
  notes: string | null;
  paymentMethod: string;
  status: string;
  subtotal: number;
  shipping: number;
  total: number;
  createdAt: string;
  items: OrderItem[];
  statusEvents: StatusEvent[];
};

const STATUS_FLOW = ["PLACED", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

const STATUS_LABELS: Record<string, string> = {
  PLACED: "Placed",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const STATUS_CLASSES: Record<string, string> = {
  PLACED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-violet-100 text-violet-700",
  PROCESSING: "bg-amber-100 text-amber-800",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [searchBox, setSearchBox] = useState("");

  const [selected, setSelected] = useState<StoreOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // status update form
  const [nextStatus, setNextStatus] = useState("");
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadOrders(status = statusFilter, q = query) {
    setLoading(true);

    const params = new URLSearchParams();
    if (status && status !== "ALL") params.set("status", status);
    if (q) params.set("q", q);

    try {
      const res = await fetch(`/api/orders${params.toString() ? `?${params.toString()}` : ""}`);
      const data = await res.json();
      if (data.success) setOrders(data.data);
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();

    const idParam = new URLSearchParams(window.location.search).get("id");
    if (idParam) {
      fetch(`/api/orders/${idParam}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setSelected(data.data);
        })
        .catch(() => {});
    }
  }, []);

  async function openOrder(order: StoreOrder) {
    setSelected(order);
    setDetailLoading(true);
    setFormError("");
    setNote("");

    const currentIndex = STATUS_FLOW.indexOf(order.status);
    const next = STATUS_FLOW[currentIndex + 1];
    setNextStatus(next ?? "");

    try {
      const res = await fetch(`/api/orders/${order.id}`);
      const data = await res.json();
      if (data.success) setSelected(data.data);
    } catch {
      // keep the list row as the selection
    } finally {
      setDetailLoading(false);
    }
  }

  function applyStatusFilter(status: string) {
    setStatusFilter(status);
    loadOrders(status, query);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQuery(searchBox.trim());
    loadOrders(statusFilter, searchBox.trim());
  }

  async function handleStatusUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;

    setFormError("");
    setUpdating(true);

    try {
      const res = await fetch(`/api/orders/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, note }),
      });
      const data = await res.json();

      if (!data.success) {
        setFormError(data.error || "Update failed");
        return;
      }

      setSelected(data.data);
      setNote("");
      setNextStatus(nextSuggestion(data.data.status));
      loadOrders(statusFilter, query);
    } catch {
      setFormError("Something went wrong");
    } finally {
      setUpdating(false);
    }
  }

  function nextSuggestion(status: string): string {
    const index = STATUS_FLOW.indexOf(status);
    return index >= 0 && index < STATUS_FLOW.length - 1
      ? STATUS_FLOW[index + 1]
      : "";
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Store Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customer orders placed through the storefront.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch}>
            <Input
              value={searchBox}
              onChange={(e) => setSearchBox(e.target.value)}
              placeholder="Search order/phone/name…"
              className="w-52"
            />
          </form>
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadOrders()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Status filter */}
      <div className="mb-5 flex flex-wrap gap-2">
        {["ALL", ...STATUS_FLOW, "CANCELLED"].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => applyStatusFilter(status)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
              statusFilter === status
                ? "border-slate-900 bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:border-slate-400"
            }`}
          >
            {STATUS_LABELS[status] ?? status}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        {/* Orders list */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
              No orders{statusFilter !== "ALL" ? ` in "${STATUS_LABELS[statusFilter]}"` : ""} yet.
            </div>
          ) : (
            orders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => openOrder(order)}
                className={`flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 text-left transition hover:shadow-sm ${
                  selected?.id === order.id
                    ? "border-amber-400 ring-1 ring-amber-300"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-2.5">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.customerName} · {order.phone}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString()} ·{" "}
                      {order.items.reduce((s, i) => s + i.quantity, 0)} items
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">
                    {formatPrice(order.total)}
                  </span>
                  <Badge
                    variant="outline"
                    className={STATUS_CLASSES[order.status] ?? ""}
                  >
                    {STATUS_LABELS[order.status] ?? order.status}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Order detail */}
        <div className="xl:sticky xl:top-6 xl:h-fit">
          {!selected ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
              Select an order to view details and update its fulfilment.
            </div>
          ) : detailLoading ? (
            <div className="flex h-64 items-center justify-center rounded-xl border">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold">{selected.orderNumber}</h2>
                    <p className="text-xs text-muted-foreground">
                      Placed {new Date(selected.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={STATUS_CLASSES[selected.status] ?? ""}
                  >
                    {STATUS_LABELS[selected.status] ?? selected.status}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Customer
                    </p>
                    <p className="mt-1 font-medium">{selected.customerName}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {selected.phone}
                    </p>
                    {selected.email && (
                      <p className="text-xs text-muted-foreground">
                        {selected.email}
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Delivery
                    </p>
                    <p className="mt-1 text-sm">{selected.address}</p>
                    {selected.city && (
                      <p className="text-xs text-muted-foreground">
                        {selected.city}
                      </p>
                    )}
                    <p className="mt-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      COD
                    </p>
                  </div>
                </div>

                {selected.notes && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {selected.notes}
                  </div>
                )}

                {/* Items */}
                <div className="mt-4 space-y-2">
                  {selected.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.sku} · {item.variantName} · ×{item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-1 border-t pt-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(selected.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>
                      {selected.shipping === 0
                        ? "Free"
                        : formatPrice(selected.shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span>{formatPrice(selected.total)}</span>
                  </div>
                </div>
              </div>

              {/* Fulfilment timeline */}
              <div className="rounded-xl border bg-card p-5">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Receipt className="h-4 w-4 text-amber-600" />
                  Fulfilment timeline
                </h3>

                <ol className="mt-4 space-y-3 border-l-2 border-slate-100 pl-4">
                  {selected.statusEvents.map((event) => (
                    <li key={event.id} className="relative">
                      <span
                        className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${
                          event.status === "CANCELLED"
                            ? "bg-red-500"
                            : event.status === "DELIVERED"
                              ? "bg-green-600"
                              : "bg-amber-500"
                        }`}
                      />
                      <p className="text-sm font-medium">
                        {STATUS_LABELS[event.status] ?? event.status}
                        {event.note && (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            — {event.note}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.at).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Status update */}
              <div className="rounded-xl border bg-card p-5">
                <h3 className="font-semibold">Update fulfilment</h3>

                {selected.status === "CANCELLED" ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    This order was cancelled. Stock was restored.
                  </p>
                ) : selected.status === "DELIVERED" ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Order delivered. Sign off complete.
                  </p>
                ) : (
                  <form onSubmit={handleStatusUpdate} className="mt-3 space-y-3">
                    <div>
                      <Label htmlFor="next-status">Move to</Label>
                      <select
                        id="next-status"
                        value={nextStatus}
                        onChange={(e) => setNextStatus(e.target.value)}
                        className="mt-1 w-full rounded-md border bg-white p-2 text-sm outline-none"
                      >
                        {STATUS_FLOW.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </option>
                        ))}
                        <option value="CANCELLED">Cancel order</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="event-note">Note (optional)</Label>
                      <Input
                        id="event-note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="mt-1"
                        placeholder="e.g. Called customer, will deliver Tuesday"
                      />
                    </div>

                    {formError && (
                      <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                        {formError}
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={updating || !nextStatus}
                      className="w-full"
                    >
                      {updating && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {nextStatus === "CANCELLED"
                        ? "Cancel order"
                        : `Mark as ${STATUS_LABELS[nextStatus]}`}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}