"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { FolderTree, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
  group: string | null;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  _count?: { products: number };
};

type FormState = {
  id: string | null;
  name: string;
  group: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  id: null,
  name: "",
  group: "",
  description: "",
  imageUrl: "",
  isActive: true,
};

function CategoryForm({
  form,
  saving,
  uploading,
  imageInput,
  onField,
  onUploadFile,
  onSave,
  onCancel,
}: {
  form: FormState;
  saving: boolean;
  uploading: boolean;
  imageInput: RefObject<HTMLInputElement | null>;
  onField: (patch: Partial<FormState>) => void;
  onUploadFile: (onUrl: (url: string) => void) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input
            placeholder="Cement & Binding"
            value={form.name}
            onChange={(e) => onField({ name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Group</Label>
          <Input
            placeholder="Masonry & Civil"
            value={form.group}
            onChange={(e) => onField({ group: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          placeholder="Brief description..."
          value={form.description}
          onChange={(e) => onField({ description: e.target.value })}
          className="min-h-20"
        />
      </div>

      <div className="space-y-2">
        <Label>Category image</Label>
        <input
          ref={imageInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={() => onUploadFile((url) => onField({ imageUrl: url }))}
        />
        <div className="flex items-center gap-3">
          {form.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.imageUrl}
              alt="Category preview"
              className="h-16 w-28 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-16 w-28 items-center justify-center rounded-md bg-muted">
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => imageInput.current?.click()}
          >
            {uploading ? "Uploading..." : "Upload image"}
          </Button>
          {form.imageUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onField({ imageUrl: "" })}
            >
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Wide 640&times;360 thumbnails work best for the storefront category
          tiles. Leave empty to use a product photo instead.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => onField({ isActive: e.target.checked })}
        />
        Active (shown on the storefront)
      </label>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : form.id ? "Save Changes" : "Save Category"}
        </Button>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);

  async function fetchCategoriesList(): Promise<Category[]> {
    try {
      const response = await fetch("/api/categories?withCounts=true");
      const data = await response.json();

      return response.ok && Array.isArray(data) ? (data as Category[]) : [];
    } catch (error) {
      console.error("Failed to load categories:", error);

      return [];
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const list = await fetchCategoriesList();

      if (cancelled) return;

      setCategories(list);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  function startCreate() {
    setForm({ ...emptyForm });
    setShowForm(true);
  }

  async function reloadCategories() {
    const list = await fetchCategoriesList();
    setCategories(list);
  }

  function startEdit(category: Category) {
    setForm({
      id: category.id,
      name: category.name,
      group: category.group ?? "",
      description: category.description ?? "",
      imageUrl: category.imageUrl ?? "",
      isActive: category.isActive,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm({ ...emptyForm });
  }

  function uploadFile(onUrl: (url: string) => void) {
    const file = imageInput.current?.files?.[0];

    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", "category");

    setUploading(true);

    fetch("/api/upload", {
      method: "POST",
      body: formData,
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Upload failed.");
        }

        return data.url as string;
      })
      .then((url) => onUrl(url))
      .catch((error) => {
        console.error(error);
        alert(error.message || "Upload failed.");
      })
      .finally(() => {
        setUploading(false);

        if (imageInput.current) {
          imageInput.current.value = "";
        }
      });
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
            group: form.group.trim() || null,
            description: form.description.trim() || null,
            imageUrl: form.imageUrl.trim() || null,
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
      await reloadCategories();
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

      await reloadCategories();
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

      {showForm && !form.id && (
        <Card>
          <CardHeader>
            <CardTitle>Create Category</CardTitle>
          </CardHeader>

          <CardContent>
            <CategoryForm
              form={form}
              saving={saving}
              uploading={uploading}
              imageInput={imageInput}
              onField={(patch) => setForm((f) => ({ ...f, ...patch }))}
              onUploadFile={(onUrl) => uploadFile(onUrl)}
              onSave={saveCategory}
              onCancel={closeForm}
            />
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
                    {items.map((category) =>
                    form.id === category.id ? (
                      <Card
                        key={category.id}
                        size="sm"
                        className="ring-primary/50"
                      >
                        <CardHeader>
                          <CardTitle>Edit: {category.name}</CardTitle>
                          <CardAction>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={closeForm}
                            >
                              Close
                            </Button>
                          </CardAction>
                        </CardHeader>
                        <CardContent>
                          <CategoryForm
                            form={form}
                            saving={saving}
                            uploading={uploading}
                            imageInput={imageInput}
                            onField={(patch) =>
                              setForm((f) => ({ ...f, ...patch }))
                            }
                            onUploadFile={(onUrl) => uploadFile(onUrl)}
                            onSave={saveCategory}
                            onCancel={closeForm}
                          />
                        </CardContent>
                      </Card>
                    ) : (
                      <div
                        key={category.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {category.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={category.imageUrl}
                              alt={category.name}
                              className="h-10 w-16 shrink-0 rounded-md object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md bg-muted">
                              <FolderTree className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}

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
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {category._count?.products ?? 0} product
                            {(category._count?.products ?? 0) === 1 ? "" : "s"}
                          </Badge>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(category)}
                          >
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
                    )
                  )}
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