"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderTree, Pencil, Plus, Trash2 } from "lucide-react";

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

type Category = {
  id: string;
  name: string;
  slug: string;
  group: string;
  description: string | null;
  isActive: boolean;
  _count?: { products: number };
};

type FormState = {
  id: string | null;
  name: string;
  group: string;
  description: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  id: null,
  name: "",
  group: "",
  description: "",
  isActive: true,
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/categories?withCounts=true");
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to load categories.");
        return;
      }

      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load categories:", error);
      alert("Failed to load categories.");
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  function startCreate() {
    setForm({ ...emptyForm });
    setShowForm(true);
  }

  function startEdit(category: Category) {
    setForm({
      id: category.id,
      name: category.name,
      group: category.group,
      description: category.description ?? "",
      isActive: category.isActive,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm({ ...emptyForm });
  }

  async function saveCategory() {
    if (!form.name.trim()) {
      alert("Category name is required.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        form.id ? `/api/categories/${form.id}` : "/api/categories",
        {
          method: form.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            group: form.group.trim() || "General",
            description: form.description.trim() || null,
            isActive: form.isActive,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to save category.");
        return;
      }

      closeForm();
      await loadCategories();
    } catch (error) {
      console.error(error);
      alert("Failed to save category.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(category: Category) {
    if (
      !confirm(
        `Delete category "${category.name}"? Categories with linked products cannot be deleted.`
      )
    ) {
      return;
    }

    setDeletingId(category.id);

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to delete category.");
        return;
      }

      await loadCategories();
    } catch (error) {
      console.error(error);
      alert("Failed to delete category.");
    } finally {
      setDeletingId(null);
    }
  }

  const grouped = categories.reduce<Record<string, Category[]>>((acc, category) => {
    const key = category.group || "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(category);
    return acc;
  }, {});

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FolderTree className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Categories</h1>
          </div>
          <p className="text-muted-foreground">
            Organise products into groups and subcategories for the storefront.
          </p>
        </div>

        <Button onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Category
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{form.id ? "Edit Category" : "Create Category"}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="Cement & Binding"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Group</Label>
                <Input
                  placeholder="Masonry & Civil"
                  value={form.group}
                  onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description..."
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="min-h-20"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
              />
              Active (shown on the storefront)
            </label>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeForm}>
                Cancel
              </Button>
              <Button onClick={saveCategory} disabled={saving}>
                {saving ? "Saving..." : form.id ? "Save Changes" : "Save Category"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
        </CardHeader>

        <CardContent>
          {categories.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No categories found.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([group, items]) => (
                <div key={group}>
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </h2>

                  <div className="space-y-2">
                    {items.map((category) => (
                      <div
                        key={category.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{category.name}</span>
                            <Badge variant="outline">{category.slug}</Badge>
                            {!category.isActive && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          {category.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {category.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {category._count?.products ?? 0} product
                            {(category._count?.products ?? 0) === 1 ? "" : "s"}
                          </Badge>

                          <Button variant="outline" size="sm" onClick={() => startEdit(category)}>
                            <Pencil className="mr-1 h-3 w-3" />
                            Edit
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCategory(category)}
                            disabled={deletingId === category.id}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            {deletingId === category.id ? "..." : "Delete"}
                          </Button>
                        </div>
                      </div>
                    ))}
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