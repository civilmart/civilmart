"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { Package, PackageX, Pencil, Plus, Search, Star, Trash2, Wand2 } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { PRODUCT_UNITS } from "@/lib/catalog";

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
  group: string;
};

type ProductVariant = {
  id: string | null;
  sku: string;
  barcode: string | null;
  name: string;
  sizeValue: number;
  sizeUnit: string;
  price: number | null;
  imageUrl: string | null;
  status: string;
};

type Product = {
  id: string;
  code: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  description: string | null;
  status: string;
  imageUrl: string | null;
  imageUrl2: string | null;
  price: number | null;
  isFeatured: boolean;
  unit: string;
  subcategory: string | null;
  stockQuantity: number;
  minimumStock: string | number | null;
  maximumStock: string | number | null;
  reorderLevel: string | number | null;
  trades: string[];
  category: Category | null;
  variants: ProductVariant[];
};

type VariantForm = {
  id: string | null;
  sku: string;
  barcode: string;
  name: string;
  sizeValue: string;
  sizeUnit: string;
  price: string;
  imageUrl: string;
};

type ProductFormState = {
  id: string | null;
  code: string;
  barcode: string;
  name: string;
  brand: string;
  description: string;
  status: string;
  imageUrl: string;
  imageUrl2: string;
  price: string;
  categoryId: string;
  unit: string;
  subcategory: string;
  stockQuantity: string;
  minimumStock: string;
  maximumStock: string;
  reorderLevel: string;
  trades: string;
  isFeatured: boolean;
  variants: VariantForm[];
};

const emptyVariant: VariantForm = {
  id: null,
  sku: "",
  barcode: "",
  name: "",
  sizeValue: "",
  sizeUnit: "UNIT",
  price: "",
  imageUrl: "",
};

const emptyForm: ProductFormState = {
  id: null,
  code: "",
  barcode: "",
  name: "",
  brand: "",
  description: "",
  status: "ACTIVE",
  imageUrl: "",
  imageUrl2: "",
  price: "",
  categoryId: "",
  unit: "BAG",
  subcategory: "",
  stockQuantity: "0",
  minimumStock: "",
  maximumStock: "",
  reorderLevel: "",
  trades: "",
  isFeatured: false,
  variants: [],
};

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductFormState>({
    ...emptyForm,
  });

  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadProducts() {
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
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [productsResponse, categoriesResponse] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/categories"),
        ]);

        if (cancelled) return;

        const productsData = await productsResponse.json();
        const categoriesData = await categoriesResponse.json();

        if (cancelled) return;

        if (productsResponse.ok) {
          setProducts(
            Array.isArray(productsData) ? productsData : productsData.data ?? []
          );
        }

        if (categoriesResponse.ok) {
          setCategories(
            Array.isArray(categoriesData) ? categoriesData : []
          );
        }
      } catch (error) {
        console.error("Failed to load products:", error);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  function startCreate() {
    setForm({ ...emptyForm, variants: [] });
    setShowForm(true);
  }

  function startEdit(product: Product) {
    setForm({
      id: product.id,
      code: product.code,
      barcode: product.barcode ?? "",
      name: product.name,
      brand: product.brand ?? "",
      description: product.description ?? "",
      status: product.status,
      imageUrl: product.imageUrl ?? "",
      imageUrl2: product.imageUrl2 ?? "",
      price: product.price !== null ? String(product.price) : "",
      categoryId: product.category?.id ?? "",
      unit: product.unit,
      subcategory: product.subcategory ?? "",
      stockQuantity: String(product.stockQuantity),
      minimumStock:
        product.minimumStock !== null && product.minimumStock !== undefined
          ? String(product.minimumStock)
          : "",
      maximumStock:
        product.maximumStock !== null && product.maximumStock !== undefined
          ? String(product.maximumStock)
          : "",
      reorderLevel:
        product.reorderLevel !== null && product.reorderLevel !== undefined
          ? String(product.reorderLevel)
          : "",
      trades: Array.isArray(product.trades) ? product.trades.join(", ") : "",
      isFeatured: product.isFeatured,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        barcode: variant.barcode ?? "",
        name: variant.name,
        sizeValue: String(variant.sizeValue),
        sizeUnit: variant.sizeUnit,
        price: variant.price !== null ? String(variant.price) : "",
        imageUrl: variant.imageUrl ?? "",
      })),
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm({ ...emptyForm });
  }

  function updateFormField<K extends keyof ProductFormState>(
    field: K,
    value: ProductFormState[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function addVariant() {
    setForm((current) => ({
      ...current,
      variants: [...current.variants, { ...emptyVariant, sizeUnit: current.unit || "BAG" }],
    }));
  }

  function removeVariant(index: number) {
    setForm((current) => ({
      ...current,
      variants: current.variants.filter(
        (_, variantIndex) => variantIndex !== index
      ),
    }));
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

  function generateBarcode() {
    const code = form.barcode.trim();
    if (code) {
      if (!confirm("Replace the current barcode with a new one?")) return;
    }

    const candidate = `CM${String(Math.floor(100000000 + Math.random() * 899999999))}`;
    updateFormField("barcode", candidate);
  }

  function generateVariantBarcode(index: number) {
    setForm((current) => {
      const productBarcode = current.barcode.trim() || `CM${Date.now()}`;

      return {
        ...current,
        variants: current.variants.map((v, i) =>
          i === index
            ? { ...v, barcode: `${productBarcode}-V${index + 1}-${String(Math.floor(1000 + Math.random() * 8999))}` }
            : v
        ),
      };
    });
  }

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) {
      return products;
    }

    return products.filter((product) => {
      const productMatch =
        product.code.toLowerCase().includes(term) ||
        (product.barcode ?? "").toLowerCase().includes(term) ||
        product.name.toLowerCase().includes(term) ||
        (product.brand ?? "").toLowerCase().includes(term) ||
        (product.category?.name ?? "").toLowerCase().includes(term);

      const variantMatch = product.variants.some(
        (variant) =>
          variant.sku.toLowerCase().includes(term) ||
          (variant.barcode ?? "").toLowerCase().includes(term) ||
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

    if (!PRODUCT_UNITS.includes(form.unit)) {
      alert("Please select a valid unit.");
      return false;
    }

    if (form.stockQuantity === "" || Number(form.stockQuantity) < 0) {
      alert("Stock quantity must be zero or more.");
      return false;
    }

    if (
      form.variants.some((variant) => !variant.sku.trim() || !variant.name.trim())
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
        barcode: form.barcode.trim() || null,
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        description: form.description.trim() || null,
        status: form.status,
        imageUrl: form.imageUrl.trim() || null,
        imageUrl2: form.imageUrl2.trim() || null,
        price: form.price === "" ? null : form.price,
        categoryId: form.categoryId || null,
        unit: form.unit,
        subcategory: form.subcategory.trim() || null,
        stockQuantity: form.stockQuantity,
        minimumStock: form.minimumStock === "" ? null : form.minimumStock,
        maximumStock: form.maximumStock === "" ? null : form.maximumStock,
        reorderLevel: form.reorderLevel === "" ? null : form.reorderLevel,
        trades: form.trades
          .split(",")
          .map((trade) => trade.trim())
          .filter(Boolean),
        isFeatured: form.isFeatured,
        variants: form.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku.trim(),
          barcode: variant.barcode.trim() || null,
          name: variant.name.trim(),
          sizeValue: variant.sizeValue,
          sizeUnit: variant.sizeUnit,
          price: variant.price === "" ? null : variant.price,
          imageUrl: variant.imageUrl.trim() || null,
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
        `Discontinue "${product.name}"? The product will be hidden from the storefront. Existing orders are unaffected.`
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
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Products</h1>
          </div>
          <p className="text-muted-foreground">
            Manage building materials, sizes, prices, stock and catalogue details.
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
            <CardTitle>{form.id ? "Edit Product" : "Create Product"}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Product Code</Label>
                <Input
                  placeholder="CEM-OPC-001"
                  value={form.code}
                  onChange={(e) => updateFormField("code", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Barcode</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={generateBarcode}
                    title="Generate a barcode automatically"
                  >
                    <Wand2 className="mr-1 h-3 w-3" />
                    Generate
                  </Button>
                </div>
                <Input
                  placeholder="CM000000001 (scan barcode at checkout)"
                  value={form.barcode}
                  onChange={(e) => updateFormField("barcode", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Print this code on the item label. Scanning it at the{" "}
                  <span className="font-medium">Invoice (POS)</span> screen adds
                  it to a bill instantly.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input
                  placeholder="Ordinary Portland Cement"
                  value={form.name}
                  onChange={(e) => updateFormField("name", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Brand</Label>
                <Input
                  placeholder="Bestway (optional)"
                  value={form.brand}
                  onChange={(e) => updateFormField("brand", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.categoryId}
                  onChange={(e) => updateFormField("categoryId", e.target.value)}
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.group ? `${category.group} / ` : ""}
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Unit</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.unit}
                  onChange={(e) => updateFormField("unit", e.target.value)}
                >
                  {PRODUCT_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Price (per unit)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="1450"
                  value={form.price}
                  onChange={(e) => updateFormField("price", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Stock Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="500"
                  value={form.stockQuantity}
                  onChange={(e) => updateFormField("stockQuantity", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Subcategory</Label>
                <Input
                  placeholder="Cement & Binding"
                  value={form.subcategory}
                  onChange={(e) => updateFormField("subcategory", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Trades (comma separated)</Label>
                <Input
                  placeholder="Masonry & Civil, Concrete"
                  value={form.trades}
                  onChange={(e) => updateFormField("trades", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Minimum Stock</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="100"
                  value={form.minimumStock}
                  onChange={(e) => updateFormField("minimumStock", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Maximum Stock</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="2000"
                  value={form.maximumStock}
                  onChange={(e) => updateFormField("maximumStock", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Reorder Level</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="150"
                  value={form.reorderLevel}
                  onChange={(e) => updateFormField("reorderLevel", e.target.value)}
                />
              </div>

              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Status</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.status}
                    onChange={(e) => updateFormField("status", e.target.value)}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="DISCONTINUED">DISCONTINUED</option>
                  </select>
                </div>

                <Button
                  type="button"
                  variant={form.isFeatured ? "default" : "outline"}
                  onClick={() => updateFormField("isFeatured", !form.isFeatured)}
                >
                  <Star className="mr-2 h-4 w-4" />
                  {form.isFeatured ? "Featured" : "Mark Featured"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Product description..."
                value={form.description}
                onChange={(e) => updateFormField("description", e.target.value)}
                className="min-h-24"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Primary Image URL</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={imageUploading}
                    onClick={() => mainImageInput.current?.click()}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    {imageUploading ? "Uploading..." : "Upload Image"}
                  </Button>
                  <input
                    ref={mainImageInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={() =>
                      uploadFile(mainImageInput, (url) =>
                        updateFormField("imageUrl", url)
                      )
                    }
                  />
                </div>
                <Input
                  placeholder="https://res.cloudinary.com/..."
                  value={form.imageUrl}
                  onChange={(e) => updateFormField("imageUrl", e.target.value)}
                />
                {form.imageUrl && (
                  <div className="pt-1">
                    <ProductImage src={form.imageUrl} className={previewSize} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Secondary Image URL</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={imageUploading}
                    onClick={() => secondaryImageInput.current?.click()}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    {imageUploading ? "Uploading..." : "Upload Image"}
                  </Button>
                  <input
                    ref={secondaryImageInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={() =>
                      uploadFile(secondaryImageInput, (url) =>
                        updateFormField("imageUrl2", url)
                      )
                    }
                  />
                </div>
                <Input
                  placeholder="https://res.cloudinary.com/..."
                  value={form.imageUrl2}
                  onChange={(e) => updateFormField("imageUrl2", e.target.value)}
                />
                {form.imageUrl2 && (
                  <div className="pt-1">
                    <ProductImage src={form.imageUrl2} className={previewSize} />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Product Variants / SKUs</h2>
                <Button variant="outline" onClick={addVariant}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Variant
                </Button>
              </div>

              {form.variants.length === 0 && (
                <p className="rounded-md bg-muted px-3 py-3 text-sm text-muted-foreground">
                  Optional. Variants are pack sizes with their own SKU and price
                  (for example: 50kg bag, 25kg bag).
                </p>
              )}

              {form.variants.map((variant, index) => (
                <div key={index} className="rounded-lg border p-4">
                  <div className="grid gap-4 md:grid-cols-6">
                    <div className="space-y-2">
                      <Label>SKU</Label>
                      <Input
                        placeholder="CEM-BEST-50"
                        value={variant.sku}
                        onChange={(e) => updateVariant(index, "sku", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Variant Name</Label>
                      <Input
                        placeholder="50kg bag"
                        value={variant.name}
                        onChange={(e) => updateVariant(index, "name", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Size</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="50"
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
                        onChange={(e) => updateVariant(index, "sizeUnit", e.target.value)}
                      >
                        {PRODUCT_UNITS.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVariant(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="1450"
                        value={variant.price}
                        onChange={(e) => updateVariant(index, "price", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-5">
                      <div className="flex items-center justify-between gap-2">
                        <Label>Variant Image URL</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => generateVariantBarcode(index)}
                          title="Generate a barcode for this variant"
                        >
                          <Wand2 className="mr-1 h-3 w-3" />
                          Barcode
                        </Button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input
                          placeholder="https://... (optional)"
                          value={variant.imageUrl}
                          onChange={(e) => updateVariant(index, "imageUrl", e.target.value)}
                        />
                        <Input
                          placeholder="Barcode (optional)"
                          value={variant.barcode}
                          onChange={(e) => updateVariant(index, "barcode", e.target.value)}
                        />
                      </div>
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
                {saving ? "Saving..." : form.id ? "Save Changes" : "Save Product"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Product Catalogue</CardTitle>

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
                <div key={product.id} className="rounded-lg border p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start">
                    <ProductImage src={product.imageUrl} className="h-20 w-20 shrink-0" />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold">{product.name}</h2>
                        <Badge>{product.code}</Badge>
                        {product.barcode && <Badge variant="outline">{product.barcode}</Badge>}
                        {product.brand && <Badge variant="secondary">{product.brand}</Badge>}
                        <Badge variant="secondary">{product.status}</Badge>
                        {product.isFeatured && (
                          <Badge variant="outline">
                            <Star className="mr-1 h-3 w-3" />
                            Featured
                          </Badge>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {product.category
                          ? `${product.category.group ? `${product.category.group} · ` : ""}${product.category.name}`
                          : "No category"}{" "}
                        · {product.unit}
                        {product.stockQuantity <= 0 ? (
                          <span className="ml-2 inline-flex items-center gap-1 font-medium text-red-600">
                            <PackageX className="h-3.5 w-3.5" />
                            Out of stock
                          </span>
                        ) : (
                          <span className="ml-2 text-foreground">
                            ·{" "}
                            {new Intl.NumberFormat("en-US", {
                              maximumFractionDigits: 2,
                            }).format(product.stockQuantity)}{" "}
                            {product.unit.toLowerCase()}
                          </span>
                        )}
                      </p>

                      <p className="mt-1 text-sm">
                        {product.price !== null ? (
                          <span className="font-medium">
                            {formatMoney(product.price)} / {product.unit.toLowerCase()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No price set</span>
                        )}
                        {product.subcategory && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {product.subcategory}
                          </span>
                        )}
                      </p>

                      {Array.isArray(product.trades) && product.trades.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Trades: {product.trades.join(", ")}
                        </p>
                      )}

                      {product.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Button variant="outline" onClick={() => startEdit(product)}>
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

                  {product.variants.length > 0 && (
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {product.variants.map((variant) => (
                        <div
                          key={variant.id ?? variant.sku}
                          className="rounded-md bg-muted/40 p-3"
                        >
                          <div className="flex items-start gap-3">
                            {variant.imageUrl && (
                              <ProductImage src={variant.imageUrl} className="h-10 w-10 shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate font-medium">{variant.name}</span>
                                <Badge variant="outline">{variant.status}</Badge>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                SKU:{" "}
                                <span className="font-medium text-foreground">{variant.sku}</span>
                                {variant.barcode && (
                                  <>
                                    {" "}
                                    · Barcode{" "}
                                    <span className="font-medium text-foreground">
                                      {variant.barcode}
                                    </span>
                                  </>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Size:{" "}
                                <span className="font-medium text-foreground">
                                  {new Intl.NumberFormat("en-US", {
                                    maximumFractionDigits: 2,
                                  }).format(variant.sizeValue)}{" "}
                                  {variant.sizeUnit}
                                </span>
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Price:{" "}
                                <span className="font-medium text-foreground">
                                  {variant.price !== null ? formatMoney(variant.price) : "—"}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}