"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  Package,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";

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

type ProductVariant = {
  id: string | null;
  sku: string;
  name: string;
  sizeValue: number;
  sizeUnit: "ML" | "L";
  price: number | null;
  imageUrl: string | null;
  stockQuantity: number;
  status: string;
};

type Product = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  imageUrl: string | null;
  imageUrl2: string | null;
  price: number | null;
  isFeatured: boolean;
  category: string | null;
  variants: ProductVariant[];
};

type VariantForm = {
  id: string | null;
  sku: string;
  name: string;
  sizeValue: string;
  sizeUnit: "ML" | "L";
  price: string;
  imageUrl: string;
  stockQuantity: string;
};

type ProductFormState = {
  id: string | null;
  code: string;
  name: string;
  description: string;
  status: string;
  imageUrl: string;
  imageUrl2: string;
  price: string;
  category: string;
  isFeatured: boolean;
  variants: VariantForm[];
};

const emptyVariant: VariantForm = {
  id: null,
  sku: "",
  name: "",
  sizeValue: "",
  sizeUnit: "ML",
  price: "",
  imageUrl: "",
  stockQuantity: "0",
};

const emptyForm: ProductFormState = {
  id: null,
  code: "",
  name: "",
  description: "",
  status: "ACTIVE",
  imageUrl: "",
  imageUrl2: "",
  price: "",
  category: "",
  isFeatured: false,
  variants: [{ ...emptyVariant }],
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductFormState>({
    ...emptyForm,
  });

  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProducts = async () => {
    try {
      const response = await fetch("/api/products");
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to load products.");
        return;
      }

      setProducts(Array.isArray(data) ? data : data.data ?? []);
    } catch (error) {
      console.error("Failed to load products:", error);
      alert("Failed to load products.");
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  function startCreate() {
    setForm({
      ...emptyForm,
      variants: [{ ...emptyVariant }],
    });
    setShowForm(true);
  }

  function startEdit(product: Product) {
    setForm({
      id: product.id,
      code: product.code,
      name: product.name,
      description: product.description ?? "",
      status: product.status,
      imageUrl: product.imageUrl ?? "",
      imageUrl2: product.imageUrl2 ?? "",
      price: product.price !== null ? String(product.price) : "",
      category: product.category ?? "",
      isFeatured: product.isFeatured,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        name: variant.name,
        sizeValue: String(variant.sizeValue),
        sizeUnit: variant.sizeUnit,
        price: variant.price !== null ? String(variant.price) : "",
        imageUrl: variant.imageUrl ?? "",
        stockQuantity: String(variant.stockQuantity),
      })),
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm({ ...emptyForm });
  }

  function updateFormField(
    field: keyof ProductFormState,
    value: ProductFormState[typeof field]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function addVariant() {
    setForm((current) => ({
      ...current,
      variants: [...current.variants, { ...emptyVariant }],
    }));
  }

  function removeVariant(index: number) {
    setForm((current) => {
      if (current.variants.length === 1) {
        return current;
      }

      return {
        ...current,
        variants: current.variants.filter(
          (_, variantIndex) => variantIndex !== index
        ),
      };
    });
  }

  function updateVariant(
    index: number,
    field: keyof VariantForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) => {
        if (variantIndex !== index) {
          return variant;
        }

        return { ...variant, [field]: value };
      }),
    }));
  }

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) {
      return products;
    }

    return products.filter((product) => {
      const productMatch =
        product.code.toLowerCase().includes(term) ||
        product.name.toLowerCase().includes(term) ||
        (product.category ?? "").toLowerCase().includes(term);

      const variantMatch = product.variants.some(
        (variant) =>
          variant.sku.toLowerCase().includes(term) ||
          variant.name.toLowerCase().includes(term)
      );

      return productMatch || variantMatch;
    });
  }, [products, search]);

  function validate() {
    if (!form.code.trim()) {
      alert("Product code is required.");
      return false;
    }

    if (!form.name.trim()) {
      alert("Product name is required.");
      return false;
    }

    if (
      form.variants.some(
        (variant) => !variant.sku.trim() || !variant.name.trim()
      )
    ) {
      alert("Every variant requires an SKU and name.");
      return false;
    }

    if (
      form.variants.some(
        (variant) => !variant.sizeValue || Number(variant.sizeValue) <= 0
      )
    ) {
      alert("Every variant must have a valid size.");
      return false;
    }

    return true;
  }

  async function saveProduct() {
    if (!validate()) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description,
        status: form.status,
        imageUrl: form.imageUrl.trim() || null,
        imageUrl2: form.imageUrl2.trim() || null,
        price: form.price === "" ? null : form.price,
        category: form.category.trim() || null,
        isFeatured: form.isFeatured,
        variants: form.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku.trim(),
          name: variant.name.trim(),
          sizeValue: variant.sizeValue,
          sizeUnit: variant.sizeUnit,
          price: variant.price === "" ? null : variant.price,
          imageUrl: variant.imageUrl.trim() || null,
          stockQuantity: variant.stockQuantity,
        })),
      };

      const response = await fetch(
        form.id ? `/api/products/${form.id}` : "/api/products",
        {
          method: form.id ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to save product.");
        return;
      }

      alert(
        form.id
          ? "PRODUCT UPDATED SUCCESSFULLY."
          : "PRODUCT SAVED SUCCESSFULLY."
      );

      closeForm();
      await loadProducts();
    } catch (error) {
      console.error(error);
      alert("Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product: Product) {
    if (
      !confirm(
        `Delete "${product.name}"? The product will be discontinued and hidden from the storefront. Existing orders are unaffected.`
      )
    ) {
      return;
    }

    setDeletingId(product.id);

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to delete product.");
        return;
      }

      await loadProducts();
    } catch (error) {
      console.error(error);
      alert("Failed to delete product.");
    } finally {
      setDeletingId(null);
    }
  }

  function ProductImage({
    src,
    className,
  }: {
    src: string | null;
    className: string;
  }) {
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
      return (
        <div
          className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}
        >
          <Package className="h-1/3 w-1/3" />
        </div>
      );
    }

    return (
      <img
        src={src}
        alt=""
        className={`rounded-md border object-cover ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }

  const [imageUploading, setImageUploading] = useState(false);
  const mainImageInput = useRef<HTMLInputElement>(null);
  const secondaryImageInput = useRef<HTMLInputElement>(null);

  function uploadFile(
    input: RefObject<HTMLInputElement | null>,
    onUrl: (url: string) => void
  ) {
    const file = input.current?.files?.[0];

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setImageUploading(true);

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
        setImageUploading(false);

        if (input.current) {
          input.current.value = "";
        }
      });
  }

  const previewSize = "h-16 w-16";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />

            <h1 className="text-2xl font-bold">Products</h1>
          </div>

          <p className="text-muted-foreground">
            Manage fragrance products, images, prices, stock and their
            size-based SKUs.
          </p>
        </div>

        <Button onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Product
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {form.id ? "Edit Product" : "Create Product"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Product Code</Label>

                <Input
                  placeholder="PROD-001"
                  value={form.code}
                  onChange={(e) =>
                    updateFormField("code", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Product Name</Label>

                <Input
                  placeholder="Blue Ocean"
                  value={form.name}
                  onChange={(e) =>
                    updateFormField("name", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Price (PKR)</Label>

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="2500"
                  value={form.price}
                  onChange={(e) =>
                    updateFormField("price", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>

                <Input
                  placeholder="Eau de Parfum"
                  value={form.category}
                  onChange={(e) =>
                    updateFormField("category", e.target.value)
                  }
                />
              </div>

              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Status</Label>

                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.status}
                    onChange={(e) =>
                      updateFormField("status", e.target.value)
                    }
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="DISCONTINUED">DISCONTINUED</option>
                  </select>
                </div>

                <Button
                  type="button"
                  variant={
                    form.isFeatured ? "default" : "outline"
                  }
                  onClick={() =>
                    updateFormField(
                      "isFeatured",
                      !form.isFeatured
                    )
                  }
                >
                  <Star className="mr-2 h-4 w-4" />
                  {form.isFeatured
                    ? "Featured"
                    : "Mark Featured"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>

              <Textarea
                placeholder="Product description..."
                value={form.description}
                onChange={(e) =>
                  updateFormField("description", e.target.value)
                }
                className="min-h-24"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>
                    Primary Image URL (1280x1280)
                  </Label>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={imageUploading}
                    onClick={() =>
                      mainImageInput.current?.click()
                    }
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    {imageUploading
                      ? "Uploading..."
                      : "Upload Image"}
                  </Button>

                  <input
                    ref={mainImageInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={() =>
                      uploadFile(
                        mainImageInput,
                        (url) =>
                          updateFormField("imageUrl", url)
                      )
                    }
                  />
                </div>

                <Input
                  placeholder="https://res.cloudinary.com/..."
                  value={form.imageUrl}
                  onChange={(e) =>
                    updateFormField("imageUrl", e.target.value)
                  }
                />

                {form.imageUrl && (
                  <div className="pt-1">
                    <ProductImage
                      src={form.imageUrl}
                      className={previewSize}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>
                    Secondary Image URL (1280x1280)
                  </Label>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={imageUploading}
                    onClick={() =>
                      secondaryImageInput.current?.click()
                    }
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    {imageUploading
                      ? "Uploading..."
                      : "Upload Image"}
                  </Button>

                  <input
                    ref={secondaryImageInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={() =>
                      uploadFile(
                        secondaryImageInput,
                        (url) =>
                          updateFormField("imageUrl2", url)
                      )
                    }
                  />
                </div>

                <Input
                  placeholder="https://res.cloudinary.com/..."
                  value={form.imageUrl2}
                  onChange={(e) =>
                    updateFormField("imageUrl2", e.target.value)
                  }
                />

                {form.imageUrl2 && (
                  <div className="pt-1">
                    <ProductImage
                      src={form.imageUrl2}
                      className={previewSize}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">
                  Product Variants / SKUs
                </h2>

                <Button variant="outline" onClick={addVariant}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Variant
                </Button>
              </div>

              {form.variants.map((variant, index) => (
                <div
                  key={index}
                  className="rounded-lg border p-4"
                >
                  <div className="grid gap-4 md:grid-cols-6">
                    <div className="space-y-2">
                      <Label>SKU</Label>

                      <Input
                        placeholder="BO-30"
                        value={variant.sku}
                        onChange={(e) =>
                          updateVariant(index, "sku", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Variant Name</Label>

                      <Input
                        placeholder="Blue Ocean 30ml"
                        value={variant.name}
                        onChange={(e) =>
                          updateVariant(index, "name", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Size</Label>

                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="30"
                        value={variant.sizeValue}
                        onChange={(e) =>
                          updateVariant(index, "sizeValue", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Unit</Label>

                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={variant.sizeUnit}
                        onChange={(e) =>
                          updateVariant(
                            index,
                            "sizeUnit",
                            e.target.value
                          )
                        }
                      >
                        <option value="ML">ML</option>
                        <option value="L">L</option>
                      </select>
                    </div>

                    <div className="flex items-end justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVariant(index)}
                        disabled={form.variants.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Price (PKR)</Label>

                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="2500"
                        value={variant.price}
                        onChange={(e) =>
                          updateVariant(index, "price", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Stock Quantity</Label>

                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="50"
                        value={variant.stockQuantity}
                        onChange={(e) =>
                          updateVariant(
                            index,
                            "stockQuantity",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="space-y-2 md:col-span-4">
                      <Label>Variant Image URL</Label>

                      <Input
                        placeholder="https://... (optional)"
                        value={variant.imageUrl}
                        onChange={(e) =>
                          updateVariant(index, "imageUrl", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeForm}>
                Cancel
              </Button>

              <Button onClick={saveProduct} disabled={saving}>
                {saving
                  ? "Saving..."
                  : form.id
                    ? "Save Changes"
                    : "Save Product"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Product Catalog</CardTitle>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                className="pl-9"
                placeholder="Search product, SKU or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No products found.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="rounded-lg border p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start">
                    <ProductImage
                      src={product.imageUrl}
                      className="h-20 w-20 shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold">
                          {product.name}
                        </h2>

                        <Badge>{product.code}</Badge>

                        <Badge variant="secondary">
                          {product.status}
                        </Badge>

                        {product.isFeatured && (
                          <Badge variant="outline">
                            <Star className="mr-1 h-3 w-3" />
                            Featured
                          </Badge>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {product.category ?? "No category"} ·{" "}
                        {product.price !== null
                          ? `PKR ${product.price}`
                          : "No price"}
                      </p>

                      {product.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => startEdit(product)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={() => deleteProduct(product)}
                        disabled={deletingId === product.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deletingId === product.id ? "..." : "Delete"}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {product.variants.map((variant) => (
                      <div
                        key={variant.id ?? variant.sku}
                        className="rounded-md bg-muted/40 p-3"
                      >
                        <div className="flex items-start gap-3">
                          {variant.imageUrl && (
                            <ProductImage
                              src={variant.imageUrl}
                              className="h-10 w-10 shrink-0"
                            />
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-medium">
                                {variant.name}
                              </span>

                              <Badge variant="outline">
                                {variant.status}
                              </Badge>
                            </div>

                            <p className="mt-1 text-sm text-muted-foreground">
                              SKU:{" "}
                              <span className="font-medium text-foreground">
                                {variant.sku}
                              </span>
                            </p>

                            <p className="text-sm text-muted-foreground">
                              Size:{" "}
                              <span className="font-medium text-foreground">
                                {variant.sizeValue} {variant.sizeUnit}
                              </span>
                            </p>

                            <p className="text-sm text-muted-foreground">
                              Price:{" "}
                              <span className="font-medium text-foreground">
                                {variant.price !== null
                                  ? `PKR ${variant.price}`
                                  : "—"}
                              </span>
                            </p>

                            <p className="text-sm text-muted-foreground">
                              Stock:{" "}
                              <span className="font-medium text-foreground">
                                {variant.stockQuantity}
                              </span>
                            </p>
                          </div>
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