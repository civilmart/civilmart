"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Phone, Plus, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Supplier = {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
};

type FormState = {
  id: string | null;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

const emptyForm: FormState = {
  id: null,
  name: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/suppliers");
      const data = await response.json();

      if (data.success) {
        setSuppliers(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error("Failed to load suppliers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  function startCreate() {
    setForm({ ...emptyForm });
    setShowForm(true);
  }

  function startEdit(supplier: Supplier) {
    setForm({
      id: supplier.id,
      name: supplier.name,
      contactName: supplier.contactName ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      notes: supplier.notes ?? "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm({ ...emptyForm });
  }

  async function saveSupplier() {
    if (!form.name.trim()) {
      alert("Supplier name is required.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        form.id ? `/api/suppliers/${form.id}` : "/api/suppliers",
        {
          method: form.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            contactName: form.contactName.trim() || null,
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            address: form.address.trim() || null,
            notes: form.notes.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to save supplier.");
        return;
      }

      closeForm();
      await loadSuppliers();
    } catch (error) {
      console.error(error);
      alert("Failed to save supplier.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(supplier: Supplier) {
    setTogglingId(supplier.id);

    try {
      const response = await fetch(`/api/suppliers/${supplier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !supplier.isActive }),
      });

      if (response.ok) {
        await loadSuppliers();
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update supplier.");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Suppliers</h1>
          </div>
          <p className="text-muted-foreground">
            Suppliers you purchase building materials from.
          </p>
        </div>

        <Button onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Supplier
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{form.id ? "Edit Supplier" : "Create Supplier"}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  placeholder="AL-Fatah Traders"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input
                  placeholder="MessManager"
                  value={form.contactName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactName: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  placeholder="#0300 1234567"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="sales@alfatah.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                placeholder="Shop 12, Building Material Market, Muridke"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Payment terms, delivery notes..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="min-h-20"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeForm}>
                Cancel
              </Button>
              <Button onClick={saveSupplier} disabled={saving}>
                {saving ? "Saving..." : form.id ? "Save Changes" : "Save Supplier"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Suppliers</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No suppliers found.
            </div>
          ) : (
            <div className="space-y-3">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{supplier.name}</span>
                      {!supplier.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {supplier.contactName && (
                        <span>{supplier.contactName}</span>
                      )}
                      {supplier.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {supplier.phone}
                        </span>
                      )}
                      {supplier.email && <span>{supplier.email}</span>}
                    </div>

                    {supplier.address && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {supplier.address}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant={supplier.isActive ? "outline" : "default"}
                      size="sm"
                      onClick={() => toggleActive(supplier)}
                      disabled={togglingId === supplier.id}
                    >
                      {supplier.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => startEdit(supplier)}>
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}