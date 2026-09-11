"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Package,
  Plus,
  Search,
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
  id: string;
  sku: string;
  name: string;
  sizeValue: number;
  sizeUnit: "ML" | "L";
  status: string;
};

type Product = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  variants: ProductVariant[];
};

type VariantForm = {
  sku: string;
  name: string;
  sizeValue: string;
  sizeUnit: "ML" | "L";
};

const emptyVariant: VariantForm = {
  sku: "",
  name: "",
  sizeValue: "",
  sizeUnit: "ML",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [variants, setVariants] = useState<VariantForm[]>([
    { ...emptyVariant },
  ]);

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

  function resetForm() {
    setCode("");
    setName("");
    setDescription("");
    setVariants([{ ...emptyVariant }]);
  }

  function addVariant() {
    setVariants((current) => [
      ...current,
      { ...emptyVariant },
    ]);
  }

  function removeVariant(index: number) {
    setVariants((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter(
        (_, variantIndex) => variantIndex !== index
      );
    });
  }

  function updateVariant(
    index: number,
    field: keyof VariantForm,
    value: string
  ) {
    setVariants((current) =>
      current.map((variant, variantIndex) => {
        if (variantIndex !== index) {
          return variant;
        }

        return {
          ...variant,
          [field]: value,
        };
      })
    );
  }

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) {
      return products;
    }

    return products.filter((product) => {
      const productMatch =
        product.code.toLowerCase().includes(term) ||
        product.name.toLowerCase().includes(term);

      const variantMatch = product.variants.some(
        (variant) =>
          variant.sku.toLowerCase().includes(term) ||
          variant.name.toLowerCase().includes(term)
      );

      return productMatch || variantMatch;
    });
  }, [products, search]);

  async function saveProduct() {
    if (!code.trim()) {
      alert("Product code is required.");
      return;
    }

    if (!name.trim()) {
      alert("Product name is required.");
      return;
    }

    if (
      variants.some(
        (variant) =>
          !variant.sku.trim() ||
          !variant.name.trim()
      )
    ) {
      alert(
        "Every variant requires an SKU and name."
      );
      return;
    }

    if (
      variants.some(
        (variant) =>
          !variant.sizeValue ||
          Number(variant.sizeValue) <= 0
      )
    ) {
      alert(
        "Every variant must have a valid size."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/products",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            name,
            description,
            variants,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            "Failed to save product."
        );
        return;
      }

      alert(
        "PRODUCT SAVED SUCCESSFULLY."
      );

      resetForm();
      setShowForm(false);

      await loadProducts();
    } catch (error) {
      console.error(error);
      alert("Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />

            <h1 className="text-2xl font-bold">
              Products
            </h1>
          </div>

          <p className="text-muted-foreground">
            Manage fragrance products and their
            size-based SKUs.
          </p>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Product
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              Create Product
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Product Code
                </Label>

                <Input
                  placeholder="PROD-001"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Product Name
                </Label>

                <Input
                  placeholder="Blue Ocean"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Description
              </Label>

              <Textarea
                placeholder="Product description..."
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">
                  Product Variants / SKUs
                </h2>

                <Button
                  variant="outline"
                  onClick={addVariant}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Variant
                </Button>
              </div>

              {variants.map(
                (variant, index) => (
                  <div
                    key={index}
                    className="rounded-lg border p-4"
                  >
                    <div className="grid gap-4 md:grid-cols-5">
                      <div className="space-y-2">
                        <Label>
                          SKU
                        </Label>

                        <Input
                          placeholder="BO-30"
                          value={variant.sku}
                          onChange={(e) =>
                            updateVariant(
                              index,
                              "sku",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>
                          Variant Name
                        </Label>

                        <Input
                          placeholder="Blue Ocean 30ml"
                          value={
                            variant.name
                          }
                          onChange={(e) =>
                            updateVariant(
                              index,
                              "name",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>
                          Size
                        </Label>

                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="30"
                          value={
                            variant.sizeValue
                          }
                          onChange={(e) =>
                            updateVariant(
                              index,
                              "sizeValue",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="flex items-end gap-2">
                        <div className="flex-1 space-y-2">
                          <Label>
                            Unit
                          </Label>

                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={
                              variant.sizeUnit
                            }
                            onChange={(e) =>
                              updateVariant(
                                index,
                                "sizeUnit",
                                e.target.value
                              )
                            }
                          >
                            <option value="ML">
                              ML
                            </option>
                            <option value="L">
                              L
                            </option>
                          </select>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            removeVariant(
                              index
                            )
                          }
                          disabled={
                            variants.length ===
                            1
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Cancel
              </Button>

              <Button
                onClick={saveProduct}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save Product"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>
              Product Catalog
            </CardTitle>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                className="pl-9"
                placeholder="Search product or SKU..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
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
              {filteredProducts.map(
                (product) => (
                  <div
                    key={product.id}
                    className="rounded-lg border p-5"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-lg font-semibold">
                            {product.name}
                          </h2>

                          <Badge>
                            {product.code}
                          </Badge>

                          <Badge variant="secondary">
                            {
                              product.status
                            }
                          </Badge>
                        </div>

                        {product.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {
                              product.description
                            }
                          </p>
                        )}
                      </div>

                      <span className="text-sm text-muted-foreground">
                        {
                          product.variants
                            .length
                        }{" "}
                        SKU
                        {product.variants
                          .length !== 1
                          ? "s"
                          : ""}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {product.variants.map(
                        (variant) => (
                          <div
                            key={
                              variant.id
                            }
                            className="rounded-md bg-muted/40 p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">
                                {
                                  variant.name
                                }
                              </span>

                              <Badge variant="outline">
                                {
                                  variant.status
                                }
                              </Badge>
                            </div>

                            <p className="mt-1 text-sm text-muted-foreground">
                              SKU:{" "}
                              <span className="font-medium text-foreground">
                                {
                                  variant.sku
                                }
                              </span>
                            </p>

                            <p className="text-sm text-muted-foreground">
                              Size:{" "}
                              <span className="font-medium text-foreground">
                                {
                                  variant.sizeValue
                                }{" "}
                                {
                                  variant.sizeUnit
                                }
                              </span>
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}