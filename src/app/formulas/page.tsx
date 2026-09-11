"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Beaker,
  CheckCircle2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Product = {
  id: string;
  code: string;
  name: string;
};

type RawMaterial = {
  id: string;
  code: string;
  name: string;
  unitType: "WEIGHT" | "VOLUME" | "PIECE";
};

type IngredientForm = {
  rawMaterialId: string;
  quantity: string;
  unit: string;
  percentage: string;
  notes: string;
};

type FormulaIngredient = {
  id: string;
  quantity: number;
  unit: string;
  percentage: number | null;
  notes: string | null;
  rawMaterial: RawMaterial;
};

type FormulaVersion = {
  id: string;
  version: number;
  status: string;
  notes: string | null;
  batchSize: number;
  batchUnit: string;
  ingredients: FormulaIngredient[];
};

type Formula = {
  id: string;
  productId: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  product: Product;
  versions: FormulaVersion[];
};

const emptyIngredient: IngredientForm = {
  rawMaterialId: "",
  quantity: "",
  unit: "",
  percentage: "",
  notes: "",
};

function unitsForType(
  unitType?: RawMaterial["unitType"]
) {
  if (unitType === "WEIGHT") {
    return ["G", "KG"];
  }

  if (unitType === "VOLUME") {
    return ["ML", "L"];
  }

  if (unitType === "PIECE") {
    return ["PIECE"];
  }

  return [];
}

function statusVariant(status: string) {
  if (status === "ACTIVE") return "default";
  if (status === "ARCHIVED") return "destructive";
  return "secondary";
}

export default function FormulasPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [editingFormulaId, setEditingFormulaId] = useState<string | null>(
    null
  );

  const [productId, setProductId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1");
  const [notes, setNotes] = useState("");

  // Standard production batch
  const [batchSize, setBatchSize] = useState("1000");
  const [batchUnit, setBatchUnit] = useState("ML");

  const [ingredients, setIngredients] = useState<IngredientForm[]>([
    { ...emptyIngredient },
  ]);

  const loadData = async () => {
    try {
      const [productsRes, materialsRes, formulasRes] =
        await Promise.all([
          fetch("/api/products"),
          fetch("/api/raw-materials"),
          fetch("/api/formulas"),
        ]);

      const productsJson = await productsRes.json();
      const materialsJson = await materialsRes.json();
      const formulasJson = await formulasRes.json();

      if (!productsRes.ok) {
        throw new Error(
          productsJson.error || "Failed to load products"
        );
      }

      if (!materialsRes.ok) {
        throw new Error(
          materialsJson.error || "Failed to load raw materials"
        );
      }

      if (!formulasRes.ok) {
        throw new Error(
          formulasJson.error || "Failed to load formulas"
        );
      }

      setProducts(
        Array.isArray(productsJson)
          ? productsJson
          : productsJson.data ?? []
      );

      setRawMaterials(
        Array.isArray(materialsJson)
          ? materialsJson
          : materialsJson.data ?? []
      );

      setFormulas(
        Array.isArray(formulasJson)
          ? formulasJson
          : formulasJson.data ?? []
      );
    } catch (error) {
      console.error("Failed to load formula data:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to load formula data."
      );
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setEditingFormulaId(null);
    setProductId("");
    setCode("");
    setName("");
    setDescription("");
    setVersion("1");
    setNotes("");

    setBatchSize("1000");
    setBatchUnit("ML");

    setIngredients([{ ...emptyIngredient }]);
  }

  function closeForm() {
    resetForm();
    setShowForm(false);
  }

  function addIngredient() {
    setIngredients((current) => [
      ...current,
      { ...emptyIngredient },
    ]);
  }

  function removeIngredient(index: number) {
    setIngredients((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter(
        (_, ingredientIndex) =>
          ingredientIndex !== index
      );
    });
  }

  function updateIngredient(
    index: number,
    field: keyof IngredientForm,
    value: string
  ) {
    setIngredients((current) =>
      current.map((ingredient, ingredientIndex) => {
        if (ingredientIndex !== index) {
          return ingredient;
        }

        const updated = {
          ...ingredient,
          [field]: value,
        };

        if (field === "rawMaterialId") {
          const material = rawMaterials.find(
            (rm) => rm.id === value
          );

          updated.unit =
            unitsForType(material?.unitType)[0] ?? "";
        }

        return updated;
      })
    );
  }

  const percentageTotal = useMemo(() => {
    return ingredients.reduce(
      (sum, ingredient) =>
        sum + (Number(ingredient.percentage) || 0),
      0
    );
  }, [ingredients]);

  const filteredFormulas = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) {
      return formulas;
    }

    return formulas.filter(
      (formula) =>
        formula.code.toLowerCase().includes(term) ||
        formula.name.toLowerCase().includes(term) ||
        formula.product.name.toLowerCase().includes(term) ||
        formula.product.code.toLowerCase().includes(term)
    );
  }, [formulas, search]);

  function validateForm() {
    if (!productId) {
      alert("Please select a product.");
      return false;
    }

    if (!code.trim()) {
      alert("Formula code is required.");
      return false;
    }

    if (!name.trim()) {
      alert("Formula name is required.");
      return false;
    }

    if (
      !version ||
      !Number.isInteger(Number(version)) ||
      Number(version) <= 0
    ) {
      alert("Version must be a positive integer.");
      return false;
    }

    if (
      !batchSize ||
      !Number.isFinite(Number(batchSize)) ||
      Number(batchSize) <= 0
    ) {
      alert("Batch size must be greater than zero.");
      return false;
    }

    if (!batchUnit) {
      alert("Please select a batch unit.");
      return false;
    }

    if (
      ingredients.some(
        (ingredient) => !ingredient.rawMaterialId
      )
    ) {
      alert(
        "Please select a raw material for every ingredient."
      );
      return false;
    }

    if (
      ingredients.some(
        (ingredient) =>
          !ingredient.quantity ||
          Number(ingredient.quantity) <= 0
      )
    ) {
      alert(
        "Please enter a valid quantity for every ingredient."
      );
      return false;
    }

    if (
      ingredients.some(
        (ingredient) => !ingredient.unit
      )
    ) {
      alert(
        "Please select a unit for every ingredient."
      );
      return false;
    }

    if (
      percentageTotal > 0 &&
      Math.abs(percentageTotal - 100) > 0.01
    ) {
      alert(
        `Ingredient percentages must total 100%. Current total: ${percentageTotal.toFixed(
          2
        )}%.`
      );
      return false;
    }

    return true;
  }

  async function saveFormula() {
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      if (editingFormulaId) {
        const response = await fetch(
          `/api/formulas/${editingFormulaId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name,
              description,
              version: Number(version),
              versionNotes: notes,
              batchSize: Number(batchSize),
              batchUnit,
              ingredients,
              createNewVersion: true,
              status: "DRAFT",
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          alert(
            data.error ||
              "Failed to create formula version."
          );
          return;
        }

        alert(
          "NEW FORMULA VERSION CREATED SUCCESSFULLY."
        );
      } else {
        const response = await fetch(
          "/api/formulas",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              productId,
              code,
              name,
              description,
              version: Number(version),
              notes,
              batchSize: Number(batchSize),
              batchUnit,
              ingredients,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          alert(
            data.error ||
              "Failed to save formula."
          );
          return;
        }

        alert(
          "FORMULA SAVED SUCCESSFULLY."
        );
      }

      closeForm();
      await loadData();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to save formula."
      );
    } finally {
      setSaving(false);
    }
  }

  function startNewFormula() {
    resetForm();
    setShowForm(true);
  }

  function startEditFormula(formula: Formula) {
    const latestVersion = formula.versions[0];

    if (!latestVersion) {
      alert(
        "This formula has no version to edit."
      );
      return;
    }

    setEditingFormulaId(formula.id);
    setProductId(formula.productId);
    setCode(formula.code);
    setName(formula.name);
    setDescription(
      formula.description ?? ""
    );

    setVersion(
      String(
        latestVersion.version + 1
      )
    );

    setNotes(
      latestVersion.notes ?? ""
    );

    setBatchSize(
      String(
        latestVersion.batchSize ?? 1000
      )
    );

    setBatchUnit(
      latestVersion.batchUnit ?? "ML"
    );

    setIngredients(
      latestVersion.ingredients.map(
        (ingredient) => ({
          rawMaterialId:
            ingredient.rawMaterial.id,
          quantity:
            String(
              ingredient.quantity
            ),
          unit:
            ingredient.unit,
          percentage:
            ingredient.percentage !== null
              ? String(
                  ingredient.percentage
                )
              : "",
          notes:
            ingredient.notes ?? "",
        })
      )
    );

    setShowForm(true);
  }

  async function updateFormulaStatus(
    formulaId: string,
    status: "ACTIVE" | "ARCHIVED"
  ) {
    setActionLoading(
      `${formulaId}-${status}`
    );

    try {
      const response = await fetch(
        `/api/formulas/${formulaId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            `Failed to ${status.toLowerCase()} formula.`
        );
        return;
      }

      alert(
        status === "ACTIVE"
          ? "FORMULA ACTIVATED SUCCESSFULLY."
          : "FORMULA ARCHIVED SUCCESSFULLY."
      );

      await loadData();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Formula status update failed."
      );
    } finally {
      setActionLoading(null);
    }
  }

  const activateVersion = async (
    formula: Formula,
    formulaVersion: FormulaVersion
  ) => {
    try {
      const response = await fetch(
        `/api/formulas/${formula.id}/versions`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            versionId:
              formulaVersion.id,
            status: "ACTIVE",
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to activate version."
        );
      }

      await loadData();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to activate version."
      );
    }
  };

  async function deleteFormula(
    formula: Formula
  ) {
    if (formula.status !== "DRAFT") {
      alert(
        "Only DRAFT formulas can be deleted. Archive active formulas instead."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Delete formula "${formula.code} — ${formula.name}"?\n\nThis will also delete all of its formula versions and ingredients.`
      );

    if (!confirmed) {
      return;
    }

    setActionLoading(
      `${formula.id}-delete`
    );

    try {
      const response = await fetch(
        `/api/formulas/${formula.id}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            "Failed to delete formula."
        );
        return;
      }

      alert(
        "FORMULA DELETED SUCCESSFULLY."
      );

      await loadData();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete formula."
      );
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Beaker className="h-6 w-6" />

            <h1 className="text-2xl font-bold">
              Formulas
            </h1>
          </div>

          <p className="text-muted-foreground">
            Manage fragrance formulas, versions, and
            raw-material ingredients.
          </p>
        </div>

        <Button onClick={startNewFormula}>
          <Plus className="mr-2 h-4 w-4" />
          New Formula
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {editingFormulaId
                  ? "Create New Formula Version"
                  : "Create Formula"}
              </CardTitle>

              <Button
                variant="ghost"
                size="icon"
                onClick={closeForm}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {editingFormulaId && (
              <p className="text-sm text-muted-foreground">
                Previous versions are preserved. Saving
                creates a new version.
              </p>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Product</Label>

                <Select
                  value={productId}
                  onValueChange={setProductId}
                  disabled={
                    Boolean(
                      editingFormulaId
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>

                  <SelectContent>
                    {products.map(
                      (product) => (
                        <SelectItem
                          key={product.id}
                          value={product.id}
                        >
                          {product.code} —{" "}
                          {product.name}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Formula Code
                </Label>

                <Input
                  placeholder="FML-BO-001"
                  value={code}
                  onChange={(e) =>
                    setCode(
                      e.target.value
                    )
                  }
                  disabled={
                    Boolean(
                      editingFormulaId
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Version</Label>

                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={version}
                  onChange={(e) =>
                    setVersion(
                      e.target.value
                    )
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Formula Name
                </Label>

                <Input
                  placeholder="Blue Ocean Original"
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Description
                </Label>

                <Input
                  placeholder="Main fragrance formula"
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value
                    )
                  }
                />
              </div>
            </div>

            {/* Standard Production Batch */}
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-4">
                <h2 className="font-semibold">
                  Standard Production Batch
                </h2>

                <p className="text-sm text-muted-foreground">
                  This defines the quantity that the ingredient
                  amounts below produce. Production will scale
                  these ingredients automatically.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>
                    Batch Size
                  </Label>

                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={batchSize}
                    onChange={(e) =>
                      setBatchSize(
                        e.target.value
                      )
                    }
                    placeholder="1000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Batch Unit
                  </Label>

                  <Select
                    value={batchUnit}
                    onValueChange={
                      setBatchUnit
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="ML">
                        ML
                      </SelectItem>

                      <SelectItem value="L">
                        L
                      </SelectItem>

                      <SelectItem value="G">
                        G
                      </SelectItem>

                      <SelectItem value="KG">
                        KG
                      </SelectItem>

                      <SelectItem value="PIECE">
                        PIECE
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <div className="w-full rounded-md border bg-background px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      Production base
                    </p>

                    <p className="font-semibold">
                      {batchSize || "0"}{" "}
                      {batchUnit}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-semibold">
                    Formula Ingredients
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    Add the raw materials used in this
                    formula.
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={addIngredient}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Ingredient
                </Button>
              </div>

              {ingredients.map(
                (ingredient, index) => {
                  const material =
                    rawMaterials.find(
                      (rm) =>
                        rm.id ===
                        ingredient.rawMaterialId
                    );

                  const units =
                    unitsForType(
                      material?.unitType
                    );

                  return (
                    <div
                      key={index}
                      className="rounded-lg border p-4"
                    >
                      <div className="grid gap-4 md:grid-cols-6">
                        <div className="space-y-2 md:col-span-2">
                          <Label>
                            Raw Material
                          </Label>

                          <Select
                            value={
                              ingredient.rawMaterialId
                            }
                            onValueChange={(
                              value
                            ) =>
                              updateIngredient(
                                index,
                                "rawMaterialId",
                                value
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select material" />
                            </SelectTrigger>

                            <SelectContent>
                              {rawMaterials.map(
                                (rm) => (
                                  <SelectItem
                                    key={
                                      rm.id
                                    }
                                    value={
                                      rm.id
                                    }
                                  >
                                    {rm.code} —{" "}
                                    {rm.name}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>
                            Quantity
                          </Label>

                          <Input
                            type="number"
                            min="0"
                            step="0.0001"
                            value={
                              ingredient.quantity
                            }
                            onChange={(
                              e
                            ) =>
                              updateIngredient(
                                index,
                                "quantity",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>
                            Unit
                          </Label>

                          <Select
                            value={
                              ingredient.unit
                            }
                            onValueChange={(
                              value
                            ) =>
                              updateIngredient(
                                index,
                                "unit",
                                value
                              )
                            }
                            disabled={
                              !material
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>

                            <SelectContent>
                              {units.map(
                                (unit) => (
                                  <SelectItem
                                    key={
                                      unit
                                    }
                                    value={
                                      unit
                                    }
                                  >
                                    {unit}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>
                            Percentage
                          </Label>

                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.0001"
                            placeholder="e.g. 25"
                            value={
                              ingredient.percentage
                            }
                            onChange={(
                              e
                            ) =>
                              updateIngredient(
                                index,
                                "percentage",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="flex items-end gap-2">
                          <div className="flex-1 space-y-2">
                            <Label>
                              Notes
                            </Label>

                            <Input
                              placeholder="Optional"
                              value={
                                ingredient.notes
                              }
                              onChange={(
                                e
                              ) =>
                                updateIngredient(
                                  index,
                                  "notes",
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              removeIngredient(
                                index
                              )
                            }
                            disabled={
                              ingredients.length ===
                              1
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}

              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Ingredient Percentage Total
                  </span>

                  <span
                    className={
                      percentageTotal > 0 &&
                      Math.abs(
                        percentageTotal -
                          100
                      ) > 0.01
                        ? "font-bold text-destructive"
                        : "font-bold"
                    }
                  >
                    {percentageTotal.toFixed(
                      4
                    )}
                    %
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Version Notes
              </Label>

              <Textarea
                placeholder="Notes about this formula version..."
                value={notes}
                onChange={(e) =>
                  setNotes(
                    e.target.value
                  )
                }
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                onClick={saveFormula}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingFormulaId
                    ? "Create New Version"
                    : "Save Formula"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>
              Formula Library
            </CardTitle>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                className="pl-9"
                placeholder="Search formula or product..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredFormulas.length ===
          0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No formulas found.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFormulas.map(
                (formula) => (
                  <div
                    key={formula.id}
                    className="rounded-lg border p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-lg font-semibold">
                            {formula.name}
                          </h2>

                          <Badge>
                            {formula.code}
                          </Badge>

                          <Badge
                            variant={statusVariant(
                              formula.status
                            )}
                          >
                            {formula.status}
                          </Badge>
                        </div>

                        <p className="mt-1 text-sm text-muted-foreground">
                          Product:{" "}
                          <span className="font-medium text-foreground">
                            {
                              formula
                                .product
                                .code
                            }{" "}
                            —{" "}
                            {
                              formula
                                .product
                                .name
                            }
                          </span>
                        </p>

                        {formula.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {
                              formula.description
                            }
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            startEditFormula(
                              formula
                            )
                          }
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          New Version
                        </Button>

                        {formula.status !==
                          "ACTIVE" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              updateFormulaStatus(
                                formula.id,
                                "ACTIVE"
                              )
                            }
                            disabled={
                              actionLoading ===
                              `${formula.id}-ACTIVE`
                            }
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />

                            {actionLoading ===
                            `${formula.id}-ACTIVE`
                              ? "Activating..."
                              : "Activate"}
                          </Button>
                        )}

                        {formula.status ===
                          "ACTIVE" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateFormulaStatus(
                                formula.id,
                                "ARCHIVED"
                              )
                            }
                            disabled={
                              actionLoading ===
                              `${formula.id}-ARCHIVED`
                            }
                          >
                            <Archive className="mr-2 h-4 w-4" />

                            {actionLoading ===
                            `${formula.id}-ARCHIVED`
                              ? "Archiving..."
                              : "Archive"}
                          </Button>
                        )}

                        {formula.status ===
                          "DRAFT" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              deleteFormula(
                                formula
                              )
                            }
                            disabled={
                              actionLoading ===
                              `${formula.id}-delete`
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />

                            {actionLoading ===
                            `${formula.id}-delete`
                              ? "Deleting..."
                              : "Delete"}
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {
                          formula.versions
                            .length
                        }{" "}
                        version
                        {formula.versions
                          .length !== 1
                          ? "s"
                          : ""}
                      </span>

                      <span className="text-sm text-muted-foreground">
                        Latest:{" "}
                        <span className="font-medium text-foreground">
                          v
                          {formula
                            .versions[0]
                            ?.version ??
                            "—"}
                        </span>
                      </span>
                    </div>

                    <div className="mt-4 space-y-4">
                      {formula.versions.map(
                        (
                          formulaVersion
                        ) => (
                          <div
                            key={
                              formulaVersion.id
                            }
                            className="rounded-md bg-muted/30 p-4"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">
                                  Version{" "}
                                  {
                                    formulaVersion.version
                                  }
                                </span>

                                <Badge
                                  variant={statusVariant(
                                    formulaVersion.status
                                  )}
                                >
                                  {
                                    formulaVersion.status
                                  }
                                </Badge>

                                <Badge variant="outline">
                                  Batch:{" "}
                                  {
                                    formulaVersion.batchSize
                                  }{" "}
                                  {
                                    formulaVersion.batchUnit
                                  }
                                </Badge>

                                <span className="text-sm text-muted-foreground">
                                  {
                                    formulaVersion
                                      .ingredients
                                      .length
                                  }{" "}
                                  ingredient
                                  {formulaVersion
                                    .ingredients
                                    .length !==
                                  1
                                    ? "s"
                                    : ""}
                                </span>
                              </div>

                              {formulaVersion.status !==
                                "ACTIVE" &&
                                formula.status !==
                                  "ARCHIVED" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      activateVersion(
                                        formula,
                                        formulaVersion
                                      )
                                    }
                                    disabled={
                                      actionLoading ===
                                      `${formula.id}-version-${formulaVersion.id}`
                                    }
                                  >
                                    <CheckCircle2 className="mr-2 h-4 w-4" />

                                    {actionLoading ===
                                    `${formula.id}-version-${formulaVersion.id}`
                                      ? "Activating..."
                                      : "Activate Version"}
                                  </Button>
                                )}
                            </div>

                            {formulaVersion.notes && (
                              <p className="mt-2 text-sm text-muted-foreground">
                                {
                                  formulaVersion.notes
                                }
                              </p>
                            )}

                            <div className="mt-3 overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b text-left">
                                    <th className="px-2 py-2">
                                      Raw Material
                                    </th>

                                    <th className="px-2 py-2">
                                      Quantity
                                    </th>

                                    <th className="px-2 py-2">
                                      Unit
                                    </th>

                                    <th className="px-2 py-2">
                                      %
                                    </th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {formulaVersion.ingredients.map(
                                    (
                                      ingredient
                                    ) => (
                                      <tr
                                        key={
                                          ingredient.id
                                        }
                                        className="border-b last:border-0"
                                      >
                                        <td className="px-2 py-2">
                                          {
                                            ingredient
                                              .rawMaterial
                                              .code
                                          }{" "}
                                          —{" "}
                                          {
                                            ingredient
                                              .rawMaterial
                                              .name
                                          }
                                        </td>

                                        <td className="px-2 py-2">
                                          {
                                            ingredient.quantity
                                          }
                                        </td>

                                        <td className="px-2 py-2">
                                          {
                                            ingredient.unit
                                          }
                                        </td>

                                        <td className="px-2 py-2">
                                          {ingredient
                                            .percentage !==
                                          null
                                            ? `${ingredient.percentage}%`
                                            : "—"}
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
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