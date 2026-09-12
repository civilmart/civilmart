"use client";

import { useMemo, useState } from "react";
import { useEffect } from "react";
import { Pencil, Phone, Search, ShoppingCart, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Customer = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  orderCount: number;
  invoiceCount: number;
};

type CustomerForm = {
  id: string | null;
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
};

const emptyForm: CustomerForm = {
  id: null,
  name: "",
  phone: "",
  email: "",
  city: "",
  address: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CustomerForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  async function fetchCustomersList(): Promise<Customer[]> {
  const response = await fetch("/api/customers");
  const data = await response.json();

  return response.ok && data.success ? (data.data as Customer[]) : [];
}

async function loadCustomers() {
  const list = await fetchCustomersList();
  setCustomers(list);
}

useEffect(() => {
  let cancelled = false;

  async function init() {
    setLoading(true);
    const list = await fetchCustomersList();

    if (cancelled) return;

    setCustomers(list);
    setLoading(false);
  }

  init();

  return () => {
    cancelled = true;
  };
}, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return customers;

    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.email, customer.city]
        .filter(Boolean)
        .some((value) => (value as string).toLowerCase().includes(term))
    );
  }, [customers, search]);

  function startCreate() {
    setForm({ ...emptyForm });
    setShowForm(true);
  }

  function startEdit(customer: Customer) {
    setForm({
      id: customer.id,
      name: customer.name ?? "",
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      city: customer.city ?? "",
      address: customer.address ?? "",
    });
    setShowForm(true);
  }

  async function saveCustomer() {
    if (!form.name.trim()) {
      alert("Customer name is required.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        city: form.city.trim() || null,
        address: form.address.trim() || null,
      };

      const response = await fetch(
        form.id ? `/api/customers/${form.id}` : "/api/customers",
        {
          method: form.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to save customer.");
        return;
      }

      setShowForm(false);
      await loadCustomers();
    } catch (error) {
      console.error(error);
      alert("Failed to save customer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Customers</h1>
          </div>
          <p className="text-muted-foreground">
            Walk-in and storefront customers. Attach a customer to an invoice to
            track payments and history.
          </p>
        </div>

        <Button onClick={startCreate}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Customer Directory</CardTitle>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name, phone, email or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading customers...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-medium text-foreground">
                {customers.length === 0
                  ? "No customers yet."
                  : "No customers match your search."}
              </p>
              {customers.length === 0 && (
                <Button className="mt-4" onClick={startCreate}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add your first customer
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Name</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Contact</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">City</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Orders</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Invoices</th>
                    <th className="pb-2 font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((customer) => (
                    <tr key={customer.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <span className="font-medium">{customer.name ?? "—"}</span>
                      </td>
                      <td className="py-3 pr-4">
                        {customer.phone && (
                          <p className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {customer.phone}
                          </p>
                        )}
                        {customer.email && (
                          <p className="text-xs text-muted-foreground">
                            {customer.email}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {customer.city ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="secondary">
                          <ShoppingCart className="mr-1 h-3 w-3" />
                          {customer.orderCount}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="secondary">{customer.invoiceCount}</Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(customer)}
                        >
                          <Pencil className="mr-2 h-3 w-3" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Edit Customer" : "Add Customer"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="Customer name"
                value={form.name}
                onChange={(e) =>
                  setForm((current) => ({ ...current, name: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  placeholder="03xx-xxxxxxx"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, phone: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="customer@example.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, email: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  placeholder="Lahore"
                  value={form.city}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, city: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  placeholder="Shop / site address"
                  value={form.address}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, address: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button onClick={saveCustomer} disabled={saving}>
                {saving ? "Saving..." : form.id ? "Save Changes" : "Add Customer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}