"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Truck,
  Loader2,
  Pencil,
  Power,
} from "lucide-react";

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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

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

const initialForm = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [open, setOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] =
    useState<Supplier | null>(null);

  const [form, setForm] = useState(initialForm);

  async function loadSuppliers() {
    try {
      setLoading(true);

      const response = await fetch("/api/suppliers");
      const result = await response.json();

      if (result.success) {
        setSuppliers(result.data);
      }
    } catch (error) {
      console.error("Failed to load suppliers:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  function updateForm(field: string, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function openAddDialog() {
    setEditingSupplier(null);
    setForm(initialForm);
    setOpen(true);
  }

  function openEditDialog(supplier: Supplier) {
    setEditingSupplier(supplier);

    setForm({
      name: supplier.name,
      contactName: supplier.contactName || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
    });

    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);

      const url = editingSupplier
        ? `/api/suppliers/${editingSupplier.id}`
        : "/api/suppliers";

      const method = editingSupplier ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.error || "Failed to save supplier");
        return;
      }

      setForm(initialForm);
      setEditingSupplier(null);
      setOpen(false);

      await loadSuppliers();
    } catch (error) {
      console.error("Failed to save supplier:", error);
      alert("Failed to save supplier");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSupplier(supplier: Supplier) {
    const action = supplier.isActive
      ? "deactivate"
      : "activate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${supplier.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/suppliers/${supplier.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: !supplier.isActive,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.error || "Failed to update supplier");
        return;
      }

      await loadSuppliers();
    } catch (error) {
      console.error("Failed to update supplier:", error);
      alert("Failed to update supplier");
    }
  }

  const filteredSuppliers = suppliers.filter((supplier) => {
    const searchText = search.toLowerCase();

    return (
      supplier.name.toLowerCase().includes(searchText) ||
      supplier.contactName
        ?.toLowerCase()
        .includes(searchText) ||
      supplier.phone
        ?.toLowerCase()
        .includes(searchText) ||
      supplier.email
        ?.toLowerCase()
        .includes(searchText)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Suppliers
          </h1>

          <p className="text-muted-foreground">
            Manage raw-material suppliers and their contact information.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Supplier
            </Button>
          </DialogTrigger>

          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSupplier
                  ? "Edit Supplier"
                  : "Add Supplier"}
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Supplier Name
                  </Label>

                  <Input
                    id="name"
                    value={form.name}
                    onChange={(event) =>
                      updateForm(
                        "name",
                        event.target.value
                      )
                    }
                    placeholder="Supplier company name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactName">
                    Contact Person
                  </Label>

                  <Input
                    id="contactName"
                    value={form.contactName}
                    onChange={(event) =>
                      updateForm(
                        "contactName",
                        event.target.value
                      )
                    }
                    placeholder="Contact person's name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone
                  </Label>

                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(event) =>
                      updateForm(
                        "phone",
                        event.target.value
                      )
                    }
                    placeholder="+92..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email
                  </Label>

                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateForm(
                        "email",
                        event.target.value
                      )
                    }
                    placeholder="supplier@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  Address
                </Label>

                <Input
                  id="address"
                  value={form.address}
                  onChange={(event) =>
                    updateForm(
                      "address",
                      event.target.value
                    )
                  }
                  placeholder="Supplier address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">
                  Notes
                </Label>

                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(event) =>
                    updateForm(
                      "notes",
                      event.target.value
                    )
                  }
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={saving}
                >
                  {saving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}

                  {saving
                    ? "Saving..."
                    : editingSupplier
                      ? "Update Supplier"
                      : "Save Supplier"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>
              Suppliers ({filteredSuppliers.length})
            </CardTitle>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search suppliers..."
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Truck className="mb-3 h-10 w-10 text-muted-foreground" />

              <h3 className="font-semibold">
                No suppliers found
              </h3>

              <p className="text-sm text-muted-foreground">
                Add your first supplier to begin managing purchases.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-3 py-3 font-medium">
                      Supplier
                    </th>

                    <th className="px-3 py-3 font-medium">
                      Contact
                    </th>

                    <th className="px-3 py-3 font-medium">
                      Phone
                    </th>

                    <th className="px-3 py-3 font-medium">
                      Email
                    </th>

                    <th className="px-3 py-3 font-medium">
                      Status
                    </th>

                    <th className="px-3 py-3 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="border-b last:border-0"
                    >
                      <td className="px-3 py-3">
                        <div className="font-medium">
                          {supplier.name}
                        </div>

                        {supplier.address && (
                          <div className="text-xs text-muted-foreground">
                            {supplier.address}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {supplier.contactName || "—"}
                      </td>

                      <td className="px-3 py-3">
                        {supplier.phone || "—"}
                      </td>

                      <td className="px-3 py-3">
                        {supplier.email || "—"}
                      </td>

                      <td className="px-3 py-3">
                        <Badge
                          variant={
                            supplier.isActive
                              ? "default"
                              : "secondary"
                          }
                        >
                          {supplier.isActive
                            ? "Active"
                            : "Inactive"}
                        </Badge>
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openEditDialog(supplier)
                            }
                          >
                            <Pencil className="mr-1 h-4 w-4" />
                            Edit
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              toggleSupplier(supplier)
                            }
                          >
                            <Power className="mr-1 h-4 w-4" />
                            {supplier.isActive
                              ? "Deactivate"
                              : "Activate"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}