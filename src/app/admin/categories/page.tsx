"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  FolderTree,
  ImagePlus,
  Pencil,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";

import { fetchJson, ApiError } from "@/lib/fetch-json";
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
import { toast } from "sonner";

type Brand = {
  id: string;
  name: string;
  categoryId: string | null;
  category?: { id: string; name: string; group: string | null } | null;
};

type Trade = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  group: string | null;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  tradeId: string | null;
  trade?: { id: string; name: string } | null;
  _count?: { products: number };
};

type FormState = {
  id: string | null;
  name: string;
  group: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  tradeId: string | null;
};

const emptyForm: FormState = {
  id: null,
  name: "",
  group: "",
  description: "",
  imageUrl: "",
  isActive: true,
  tradeId: null,
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
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => onField({ isActive: e.target.checked })}
        />
        Active
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
  const [trades, setTrades] = useState<Trade[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);

  const [addingTrade, setAddingTrade] = useState(false);
  const [newTradeName, setNewTradeName] = useState("");
  const [savingTrade, setSavingTrade] = useState(false);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [addingBrandCategoryId, setAddingBrandCategoryId] = useState<string | null>(null);
  const [newBrandName, setNewBrandName] = useState("");
  const [savingBrand, setSavingBrand] = useState(false);

  async function loadData() {
    try {
      const [tradesData, catsData, brandsData] = await Promise.all([
        fetchJson<Trade[] | { data: Trade[] }>("/api/trades"),
        fetchJson<Category[] | { data: Category[] }>("/api/categories?withCounts=true"),
        fetchJson<Brand[] | { data: Brand[] }>("/api/brands"),
      ]);
      setTrades(Array.isArray(tradesData) ? tradesData : tradesData?.data ?? []);
      setCategories(Array.isArray(catsData) ? catsData : catsData?.data ?? []);
      setBrands(Array.isArray(brandsData) ? brandsData : brandsData?.data ?? []);
    } catch (e) {
      console.error("Failed to load data:", e);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function startCreate(tradeId: string | null) {
    setForm({ ...emptyForm, tradeId });
    setShowForm(true);
  }

  function startEdit(category: Category) {
    setForm({
      id: category.id,
      name: category.name,
      group: category.group ?? "",
      description: category.description ?? "",
      imageUrl: category.imageUrl ?? "",
      isActive: category.isActive,
      tradeId: category.tradeId ?? null,
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

    fetch("/api/upload", { method: "POST", body: formData })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Upload failed.");
        return data.url as string;
      })
      .then((url) => onUrl(url))
      .catch((error) => {
        console.error(error);
        toast.error(error.message || "Upload failed.");
      })
      .finally(() => {
        setUploading(false);
        if (imageInput.current) imageInput.current.value = "";
      });
  }

  async function saveCategory() {
    if (!form.name.trim()) {
      toast.error("Category name is required.");
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
            tradeId: form.tradeId,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to save category.");
        return;
      }
      closeForm();
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save category.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(category: Category) {
    if (!confirm(`Delete category "${category.name}"?`)) return;
    setDeletingId(category.id);
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to delete category.");
        return;
      }
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete category.");
    } finally {
      setDeletingId(null);
    }
  }

  async function createTrade() {
    const trimmed = newTradeName.trim();
    if (!trimmed) return;
    setSavingTrade(true);
    try {
      const response = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to create trade.");
        return;
      }
      setAddingTrade(false);
      setNewTradeName("");
      await loadData();
    } catch (e) {
      console.error(e);
      toast.error("Failed to create trade.");
    } finally {
      setSavingTrade(false);
    }
  }

  async function createBrand() {
    const trimmed = newBrandName.trim();
    if (!trimmed || !addingBrandCategoryId) return;
    setSavingBrand(true);
    try {
      const response = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, categoryId: addingBrandCategoryId }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to create brand.");
        return;
      }
      setAddingBrandCategoryId(null);
      setNewBrandName("");
      await loadData();
    } catch (e) {
      console.error(e);
      toast.error("Failed to create brand.");
    } finally {
      setSavingBrand(false);
    }
  }

  const groupedByTrade = trades
    .filter((t) => t.isActive)
    .map((trade) => ({
      trade,
      categories: categories.filter((c) => c.tradeId === trade.id),
    }));

  const uncategorized = categories.filter((c) => !c.tradeId);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FolderTree className="h-5 w-5 text-amber-600" />
          <h1 className="text-xl font-bold">Categories</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddingTrade(!addingTrade)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Trade
        </Button>
      </div>

      {addingTrade && (
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <Label className="text-xs text-muted-foreground">New trade</Label>
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={newTradeName}
              onChange={(e) => setNewTradeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void createTrade();
                if (e.key === "Escape") setAddingTrade(false);
              }}
              placeholder="Trade name"
            />
            <Button size="sm" disabled={savingTrade} onClick={() => void createTrade()}>
              {savingTrade ? "Creating..." : "Create"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAddingTrade(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showForm && !form.id && (
        <Card>
          <CardHeader>
            <CardTitle>
              Create Category
              {form.tradeId && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  under {trades.find((t) => t.id === form.tradeId)?.name}
                </span>
              )}
            </CardTitle>
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

      {groupedByTrade.map(({ trade, categories: tradeCategories }) => (
        <Card key={trade.id}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">{trade.name}</CardTitle>
                <Badge variant="outline" className="tabular-nums">
                  {tradeCategories.length} categories
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startCreate(trade.id)}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Category
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tradeCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No categories yet.
              </p>
            ) : (
              <div className="space-y-2">
                {tradeCategories.map((category) =>
                  form.id === category.id ? (
                    <Card key={category.id} size="sm" className="ring-primary/50">
                      <CardHeader>
                        <CardTitle>Edit: {category.name}</CardTitle>
                        <CardAction>
                          <Button variant="ghost" size="sm" onClick={closeForm}>
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
                          onField={(patch) => setForm((f) => ({ ...f, ...patch }))}
                          onUploadFile={(onUrl) => uploadFile(onUrl)}
                          onSave={saveCategory}
                          onCancel={closeForm}
                        />
                      </CardContent>
                    </Card>
                  ) : (
                    <div key={category.id} className="space-y-2">
                      <div
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
                      <div className="ml-6 space-y-1">
                        {brands.filter((b) => b.categoryId === category.id).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {brands
                              .filter((b) => b.categoryId === category.id)
                              .map((brand) => (
                                <Badge key={brand.id} variant="secondary" className="text-xs">
                                  <Tag className="mr-1 h-2.5 w-2.5" />
                                  {brand.name}
                                </Badge>
                              ))}
                          </div>
                        )}
                        {addingBrandCategoryId === category.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              autoFocus
                              value={newBrandName}
                              onChange={(e) => setNewBrandName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") void createBrand();
                                if (e.key === "Escape") {
                                  setAddingBrandCategoryId(null);
                                  setNewBrandName("");
                                }
                              }}
                              placeholder="Brand name"
                              className="h-7 text-xs"
                            />
                            <Button size="sm" className="h-7 text-xs" disabled={savingBrand} onClick={() => void createBrand()}>
                              {savingBrand ? "..." : "Add"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setAddingBrandCategoryId(null);
                                setNewBrandName("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-muted-foreground"
                            onClick={() => {
                              setAddingBrandCategoryId(category.id);
                              setNewBrandName("");
                            }}
                          >
                            <Plus className="mr-1 h-2.5 w-2.5" />
                            Add Brand
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {uncategorized.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">Uncategorized</CardTitle>
              <Badge variant="outline" className="tabular-nums">
                {uncategorized.length} categories
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {uncategorized.map((category) =>
                form.id === category.id ? (
                  <Card key={category.id} size="sm" className="ring-primary/50">
                    <CardHeader>
                      <CardTitle>Edit: {category.name}</CardTitle>
                      <CardAction>
                        <Button variant="ghost" size="sm" onClick={closeForm}>
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
                        onField={(patch) => setForm((f) => ({ ...f, ...patch }))}
                        onUploadFile={(onUrl) => uploadFile(onUrl)}
                        onSave={saveCategory}
                        onCancel={closeForm}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <div key={category.id} className="space-y-2">
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{category.name}</span>
                            <Badge variant="outline">{category.slug}</Badge>
                          </div>
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
                    <div className="ml-6 space-y-1">
                      {brands.filter((b) => b.categoryId === category.id).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {brands
                            .filter((b) => b.categoryId === category.id)
                            .map((brand) => (
                              <Badge key={brand.id} variant="secondary" className="text-xs">
                                <Tag className="mr-1 h-2.5 w-2.5" />
                                {brand.name}
                              </Badge>
                            ))}
                        </div>
                      )}
                      {addingBrandCategoryId === category.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            autoFocus
                            value={newBrandName}
                            onChange={(e) => setNewBrandName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void createBrand();
                              if (e.key === "Escape") {
                                setAddingBrandCategoryId(null);
                                setNewBrandName("");
                              }
                            }}
                            placeholder="Brand name"
                            className="h-7 text-xs"
                          />
                          <Button size="sm" className="h-7 text-xs" disabled={savingBrand} onClick={() => void createBrand()}>
                            {savingBrand ? "..." : "Add"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setAddingBrandCategoryId(null);
                              setNewBrandName("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-muted-foreground"
                          onClick={() => {
                            setAddingBrandCategoryId(category.id);
                            setNewBrandName("");
                          }}
                        >
                          <Plus className="mr-1 h-2.5 w-2.5" />
                          Add Brand
                        </Button>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
