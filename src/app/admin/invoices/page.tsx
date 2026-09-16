"use client";

import { useMemo, useState } from "react";
import { useEffect } from "react";
import { useRef } from "react";
import {
  Banknote,
  Barcode,
  CalendarDays,
  CreditCard,
  Minus,
  PackagePlus,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Trash2,
  User,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

type PosVariant = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
};

type PosProduct = {
  id: string;
  code: string;
  barcode: string | null;
  name: string;
  unit: string;
  stockQuantity: unknown;
  variants: PosVariant[];
};

type LineItem = {
  key: string;
  productId: string;
  variantId: string | null;
  sku: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
};

type CustomerOption = {
  id: string;
  name: string | null;
  phone: string | null;
  city: string | null;
};

type InvoiceRecord = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  paymentStatus: string;
  totalAmount: unknown;
  paidAmount: unknown;
  paymentMethod: string | null;
  notes: string | null;
  customer: { id: string; name: string | null; phone: string | null } | null;
  items: Array<{
    id: string;
    description: string;
    sku: string | null;
    unit: string;
    quantity: unknown;
    unitPrice: unknown;
    totalPrice: unknown;
  }>;
  payments: Array<{ id: string; amount: unknown; method: string; paidAt: string }>;
};

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Wallet },
  { value: "CHEQUE", label: "Cheque", icon: Wallet },
  { value: "CREDIT", label: "Credit (pay later)", icon: CalendarDays },
];

function statusBadge(status: string) {
  const lower = status.toLowerCase();

  if (lower === "paid") return <Badge>{status}</Badge>;
  if (lower === "cancelled") return <Badge variant="destructive">{status}</Badge>;
  if (lower === "overdue") return <Badge variant="destructive">{status}</Badge>;
  if (lower === "partial") return <Badge variant="secondary">{status}</Badge>;

  return <Badge variant="outline">{status}</Badge>;
}

export default function InvoicesPage() {
  const scanRef = useRef<HTMLInputElement>(null);
  const [scan, setScan] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<PosProduct[]>([]);
  const [searching, setSearching] = useState(false);

  const [items, setItems] = useState<LineItem[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [quickCustomer, setQuickCustomer] = useState("");
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);

  const [tax, setTax] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [charging, setCharging] = useState(false);

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState("");
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [payingInvoice, setPayingInvoice] = useState<string | null>(null);
  const [voidingInvoice, setVoidingInvoice] = useState<string | null>(null);

  useEffect(() => {
    scanRef.current?.focus();
  }, []);

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.success) setCustomers(d.data);
      })
      .catch(() => {});
  }, []);

  async function fetchInvoicesList(): Promise<InvoiceRecord[]> {
  const params = new URLSearchParams();
  if (invoiceSearch.trim()) params.set("q", invoiceSearch.trim());
  if (invoiceStatus) params.set("status", invoiceStatus);

  const response = await fetch(`/api/invoices?${params.toString()}`);
  const data = await response.json();

  return response.ok && data.success ? (data.data as InvoiceRecord[]) : [];
}

async function loadInvoices() {
  const list = await fetchInvoicesList();
  setInvoices(list);
}

useEffect(() => {
  let cancelled = false;

  async function init() {
    setLoadingInvoices(true);
    const list = await fetchInvoicesList();

    if (cancelled) return;

    setInvoices(list);
    setLoadingInvoices(false);
  }

  init();

  return () => {
    cancelled = true;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [invoiceSearch, invoiceStatus]);

  const isCredit = paymentMethod === "CREDIT";

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items]
  );

  const totalAmount = useMemo(() => {
    const taxAmount = (subtotal * (Number(tax) || 0)) / 100;
    return Math.max(0, subtotal + taxAmount - (Number(discount) || 0));
  }, [subtotal, tax, discount]);

  async function lookupBarcode(value: string) {
    const code = value.trim();

    if (!code) return;

    setScanning(true);
    setLastScan(code);

    try {
      const response = await fetch(`/api/products?barcode=${encodeURIComponent(code)}`);
      const products = (await response.json()) as PosProduct[];

      if (!response.ok || products.length === 0) {
        toast.error(`No product found for barcode: ${code}`);
        return;
      }

      addProduct(products[0], code);
    } catch (error) {
      console.error(error);
      toast.error("Failed to look up barcode.");
    } finally {
      setScanning(false);
      setScan("");
      scanRef.current?.focus();
    }
  }

  function addProduct(product: PosProduct, scannedBarcode?: string) {
    const stock = Number(product.stockQuantity);

    if (stock <= 0) {
      toast.error(`${product.name} is out of stock.`);
      return;
    }

    let variant: PosVariant | null = null;

    if (scannedBarcode) {
      variant =
        product.variants.find((v) => v.barcode === scannedBarcode) ?? null;
    }

    if (!variant && product.variants.length > 0) {
      variant = product.variants[0];
    }

    const lineKey = `${product.id}::${variant?.id ?? "base"}`;

    setItems((current) => {
      const existing = current.find((item) => item.key === lineKey);

      if (existing) {
        const nextQty = existing.quantity + 1;

        if (nextQty > stock) {
          toast.error(`Only ${stock} in stock for ${product.name}.`);
          return current;
        }

        return current.map((item) =>
          item.key === lineKey ? { ...item, quantity: nextQty } : item
        );
      }

      return [
        ...current,
        {
          key: lineKey,
          productId: product.id,
          variantId: variant?.id ?? null,
          sku: variant?.sku ?? product.code,
          description: product.name,
          unit: product.unit,
          quantity: 1,
          unitPrice: 0,
        },
      ];
    });
  }

  function changeQuantity(key: string, nextQty: number) {
    setItems((current) =>
      current
        .map((item) => {
          if (item.key !== key) return item;

          const clamped = Math.max(0, nextQty);

          if (clamped === 0) return null;

          return { ...item, quantity: clamped };
        })
        .filter((item): item is LineItem => item !== null)
    );
  }

  function changeUnitPrice(key: string, value: string) {
    setItems(
      (current) =>
        current.map((item) =>
          item.key === key
            ? { ...item, unitPrice: Number(value) || 0 }
            : item
        ) as LineItem[]
    );
  }

  function removeLine(key: string) {
    setItems((current) => current.filter((item) => item.key !== key));
  }

  async function searchProducts() {
    const term = searchTerm.trim();

    if (!term) return;

    setSearching(true);

    try {
      const response = await fetch(`/api/products?q=${encodeURIComponent(term)}`);
      const products = (await response.json()) as PosProduct[];

      if (!response.ok) return;

      setSearchResults(products.slice(0, 8));
    } catch (error) {
      console.error(error);
    } finally {
      setSearching(false);
    }
  }

  async function saveQuickCustomer() {
    const name = quickCustomer.trim();

    if (!name) return;

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to create customer.");
        return;
      }

      const created: CustomerOption = data.data;

      setCustomers((current) => [...current, created]);
      setCustomerId(created.id);
      setQuickCustomer("");
      setShowQuickCustomer(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create customer.");
    }
  }

  async function charge() {
    if (items.length === 0) {
      toast.error("Scan or add at least one item first.");
      return;
    }

    setCharging(true);

    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId || null,
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            description: item.description,
            sku: item.sku,
          })),
          tax: Number(tax) || 0,
          discount: Number(discount) || 0,
          paymentMethod: isCredit ? null : paymentMethod,
          dueDate: isCredit && dueDate ? dueDate : null,
          notes: notes.trim() || null,
          markPaid: !isCredit,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to create invoice.");
        return;
      }

      setItems([]);
      setTax("0");
      setDiscount("0");
      setNotes("");
      setDueDate("");
      await loadInvoices();
      scanRef.current?.focus();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create invoice.");
    } finally {
      setCharging(false);
    }
  }

  async function recordPayment(invoice: InvoiceRecord) {
    const amount = paymentAmounts[invoice.id]?.trim();

    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a payment amount.");
      return;
    }

    setPayingInvoice(invoice.id);

    try {
      const response = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          method: invoice.paymentMethod ?? "CASH",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to record payment.");
        return;
      }

      await loadInvoices();
    } catch (error) {
      console.error(error);
      toast.error("Failed to record payment.");
    } finally {
      setPayingInvoice(null);
    }
  }

  async function voidInvoice(invoice: InvoiceRecord) {
    if (!confirm(`Void invoice ${invoice.invoiceNo}? Stock will be returned.`)) {
      return;
    }

    setVoidingInvoice(invoice.id);

    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ void: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to void invoice.");
        return;
      }

      await loadInvoices();
    } catch (error) {
      console.error(error);
      toast.error("Failed to void invoice.");
    } finally {
      setVoidingInvoice(null);
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <div className="flex items-center gap-2">
          <Receipt className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Invoice / POS</h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          Scan an item&apos;s barcode to add it to the bill, then charge. Select{" "}
          <span className="font-medium">Credit (pay later)</span> to sell on
          account and track payments on the invoice list.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New Bill</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  lookupBarcode(scan);
                }}
              >
                <Label htmlFor="barcode-scan">Scan barcode</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="barcode-scan"
                      ref={scanRef}
                      className="pl-10 text-base"
                      placeholder="Scan barcode or type it (e.g. CM000000001) and press Enter"
                      value={scan}
                      onChange={(e) => setScan(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={scanning || !scan.trim()}>
                    {scanning ? "Looking..." : "Add"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {lastScan
                    ? `Last scan: ${lastScan}`
                    : "Barcode scanners type the code and press Enter automatically."}
                </p>
              </form>

              <div className="space-y-2 border-t pt-5">
                <Label>Or find by name / code</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        searchProducts();
                      }
                    }}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={searchProducts}
                    disabled={searching || !searchTerm.trim()}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="divide-y rounded-md border">
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted"
                        onClick={() => addProduct(product)}
                      >
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.code}
                            {product.barcode ? ` · ${product.barcode}` : ""}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-5">
                {items.length === 0 ? (
                  <div className="rounded-md border border-dashed py-10 text-center">
                    <PackagePlus className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No items on this bill yet. Scan a barcode to begin.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 pr-3 font-medium text-muted-foreground">Item</th>
                          <th className="w-28 pb-2 pr-3 font-medium text-muted-foreground">Qty</th>
                          <th className="w-36 pb-2 pr-3 font-medium text-muted-foreground">Unit Price</th>
                          <th className="w-28 pb-2 pr-3 text-right font-medium text-muted-foreground">Total</th>
                          <th className="w-10 pb-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.key} className="border-b last:border-0">
                            <td className="py-3 pr-3">
                              <p className="font-medium">{item.description}</p>
                              <p className="text-xs text-muted-foreground">{item.sku}</p>
                            </td>
                            <td className="py-3 pr-3">
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => changeQuantity(item.key, item.quantity - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  className="h-7 w-12 px-1 text-center"
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    changeQuantity(item.key, Number(e.target.value))
                                  }
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => changeQuantity(item.key, item.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                            <td className="py-3 pr-3">
                              <Input
                                className="h-7"
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  changeUnitPrice(item.key, e.target.value)
                                }
                              />
                            </td>
                            <td className="py-3 pr-3 text-right font-medium">
                              {formatMoney(item.quantity * item.unitPrice)}
                            </td>
                            <td className="py-3 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLine(item.key)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="grid gap-4 border-t pt-5 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="tax">Tax (%)</Label>
                  <Input
                    id="tax"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount (Rs)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
                <div className="flex items-end justify-between rounded-md bg-muted p-3">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-xl font-bold">{formatMoney(totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer & Charge</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Customer</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuickCustomer((value) => !value)}
                  >
                    <User className="mr-1 h-3 w-3" />
                    {showQuickCustomer ? "Cancel" : "Quick add"}
                  </Button>
                </div>

                {showQuickCustomer ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="New customer name"
                      value={quickCustomer}
                      onChange={(e) => setQuickCustomer(e.target.value)}
                    />
                    <Button type="button" onClick={saveQuickCustomer}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                  >
                    <option value="">Walk-in (no customer)</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name ?? "Unnamed"}
                        {customer.phone ? ` — ${customer.phone}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Payment method</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>

                {isCredit && (
                  <div className="space-y-2">
                    <Label>Due date</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  placeholder="Optional note for this invoice"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={charge}
                disabled={charging || items.length === 0}
              >
                {charging
                  ? "Charging..."
                  : isCredit
                    ? `Create Credit Invoice — ${formatMoney(totalAmount)}`
                    : `Charge ${formatMoney(totalAmount)}`}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoices</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex flex-col gap-2">
                <Input
                  placeholder="Search invoice no., customer..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                />
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={invoiceStatus}
                  onChange={(e) => setInvoiceStatus(e.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="PAID">Paid</option>
                  <option value="PARTIAL">Partially paid</option>
                  <option value="UNPAID">Unpaid</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="CANCELLED">Voided</option>
                </select>
              </div>

              {loadingInvoices ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Loading invoices...
                </div>
              ) : invoices.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No invoices match.
                </div>
              ) : (
                <div className="space-y-2">
                  {invoices.map((invoice) => {
                    const total = Number(invoice.totalAmount);
                    const paid = Number(invoice.paidAmount);
                    const remaining = Math.max(0, total - paid);
                    const isExpanded = expanded === invoice.id;
                    const canTakePayment =
                      invoice.paymentStatus !== "CANCELLED" && remaining > 0;
                    const canVoid =
                      invoice.paymentStatus !== "CANCELLED" &&
                      invoice.paymentStatus !== "PAID";

                    return (
                      <div
                        key={invoice.id}
                        className="rounded-md border"
                      >
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                          onClick={() =>
                            setExpanded(isExpanded ? null : invoice.id)
                          }
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {invoice.invoiceNo}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {invoice.customer?.name ?? "Walk-in"}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-sm font-medium">
                              {formatMoney(total)}
                            </span>
                            {statusBadge(invoice.paymentStatus)}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t px-3 py-3 text-sm">
                            <div className="mb-2 grid grid-cols-3 gap-2">
                              <div>
                                <p className="text-xs text-muted-foreground">Total</p>
                                <p className="font-medium">{formatMoney(total)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Paid</p>
                                <p className="font-medium">{formatMoney(paid)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Due</p>
                                <p className="font-medium">{formatMoney(remaining)}</p>
                              </div>
                            </div>

                            {invoice.items.length > 0 && (
                              <ul className="mb-3 space-y-1 border-t pt-2">
                                {invoice.items.map((item) => (
                                  <li
                                    key={item.id}
                                    className="flex justify-between gap-2 text-xs"
                                  >
                                    <span className="text-muted-foreground">
                                      {item.description}{" "}
                                      <span className="text-foreground">
                                        × {Number(item.quantity)}
                                      </span>
                                    </span>
                                    <span>
                                      {formatMoney(Number(item.totalPrice))}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}

                            {canTakePayment && (
                              <div className="mb-3 flex gap-2 border-t pt-3">
                                <Input
                                  className="h-9"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder={`Amount (max ${formatMoney(remaining)})`}
                                  value={paymentAmounts[invoice.id] ?? ""}
                                  onChange={(e) =>
                                    setPaymentAmounts((current) => ({
                                      ...current,
                                      [invoice.id]: e.target.value,
                                    }))
                                  }
                                />
                                <Button
                                  className="h-9"
                                  size="sm"
                                  disabled={payingInvoice === invoice.id}
                                  onClick={() => recordPayment(invoice)}
                                >
                                  <Banknote className="mr-1 h-3 w-3" />
                                  {payingInvoice === invoice.id
                                    ? "Saving..."
                                    : "Receive"}
                                </Button>
                              </div>
                            )}

                            {canVoid && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={voidingInvoice === invoice.id}
                                onClick={() => voidInvoice(invoice)}
                              >
                                <RotateCcw className="mr-1 h-3 w-3" />
                                {voidingInvoice === invoice.id
                                  ? "Voiding..."
                                  : "Void (return stock)"}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}