"use client";

import { FormEvent, useEffect, useState } from "react";
import { Edit, Plus, Search, Power } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type RawMaterial = {
  id: string;
  code: string;
  name: string;
  materialType: string;
  unitType: string;
  density: string | null;
  densityUnit: string | null;
  minimumStock: string | null;
  reorderLevel: string | null;
  isActive: boolean;
  notes?: string | null;
};

const emptyForm = {
  code: "",
  name: "",
  materialType: "OTHER",
  unitType: "VOLUME",
  density: "",
  densityUnit: "g/ml",
  minimumStock: "",
  reorderLevel: "",
  notes: "",
};

export default function RawMaterialsPage() {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingMaterial, setEditingMaterial] =
    useState<RawMaterial | null>(null);

  const [form, setForm] = useState(emptyForm);

  const loadMaterials = async () => {
    try {
      const response = await fetch("/api/raw-materials");
      const result = await response.json();

      if (result.success) {
        setMaterials(result.data);
      }
    } catch (error) {
      console.error("Failed to load raw materials:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const filteredMaterials = materials.filter((material) => {
    const query = search.toLowerCase();

    return (
      material.code.toLowerCase().includes(query) ||
      material.name.toLowerCase().includes(query) ||
      material.materialType.toLowerCase().includes(query)
    );
  });

  const openAddDialog = () => {
    setEditingMaterial(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEditDialog = (material: RawMaterial) => {
    setEditingMaterial(material);

    setForm({
      code: material.code,
      name: material.name,
      materialType: material.materialType,
      unitType: material.unitType,
      density: material.density ?? "",
      densityUnit: material.densityUnit ?? "g/ml",
      minimumStock: material.minimumStock ?? "",
      reorderLevel: material.reorderLevel ?? "",
      notes: material.notes ?? "",
    });

    setOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...form,
        density: form.density ? Number(form.density) : null,
        minimumStock: form.minimumStock
          ? Number(form.minimumStock)
          : null,
        reorderLevel: form.reorderLevel
          ? Number(form.reorderLevel)
          : null,
      };

      const response = await fetch("/api/raw-materials", {
        method: editingMaterial ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingMaterial
            ? {
                id: editingMaterial.id,
                ...payload,
              }
            : payload
        ),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.error || "Operation failed.");
        return;
      }

      setOpen(false);
      setEditingMaterial(null);
      setForm(emptyForm);

      await loadMaterials();
    } catch (error) {
      console.error("Failed to save raw material:", error);
      alert("Failed to save raw material.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (material: RawMaterial) => {
    const action = material.isActive ? "deactivate" : "reactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${material.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch("/api/raw-materials", {
        method: material.isActive ? "DELETE" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          material.isActive
            ? { id: material.id }
            : {
                id: material.id,
                isActive: true,
              }
        ),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.error || "Failed to change material status.");
        return;
      }

      await loadMaterials();
    } catch (error) {
      console.error("Failed to change material status:", error);
      alert("Failed to change material status.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Raw Materials
          </h1>

          <p className="text-muted-foreground">
            Manage fragrance ingredients and other production materials.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Raw Material
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingMaterial
                  ? "Edit Raw Material"
                  : "Add Raw Material"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Material Code *</Label>

                  <Input
                    id="code"
                    placeholder="e.g. RM-002"
                    value={form.code}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        code: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Material Name *</Label>

                  <Input
                    id="name"
                    placeholder="e.g. Lavender Oil"
                    value={form.name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Material Type *</Label>

                  <Select
                    value={form.materialType}
                    onValueChange={(value) =>
                      setForm({
                        ...form,
                        materialType: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="FRAGRANCE">
                        Fragrance
                      </SelectItem>

                      <SelectItem value="ESSENTIAL_OIL">
                        Essential Oil
                      </SelectItem>

                      <SelectItem value="CHEMICAL">
                        Chemical
                      </SelectItem>

                      <SelectItem value="ALCOHOL">
                        Alcohol
                      </SelectItem>

                      <SelectItem value="FIXATIVE">
                        Fixative
                      </SelectItem>

                      <SelectItem value="COLOR">
                        Color
                      </SelectItem>

                      <SelectItem value="PACKAGING">
                        Packaging
                      </SelectItem>

                      <SelectItem value="OTHER">
                        Other
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Unit Type *</Label>

                  <Select
                    value={form.unitType}
                    onValueChange={(value) =>
                      setForm({
                        ...form,
                        unitType: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="WEIGHT">
                        Weight
                      </SelectItem>

                      <SelectItem value="VOLUME">
                        Volume
                      </SelectItem>

                      <SelectItem value="PIECE">
                        Pieces
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="density">Density</Label>

                  <Input
                    id="density"
                    type="number"
                    step="0.000001"
                    placeholder="e.g. 0.789"
                    value={form.density}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        density: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="densityUnit">
                    Density Unit
                  </Label>

                  <Input
                    id="densityUnit"
                    placeholder="e.g. g/ml"
                    value={form.densityUnit}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        densityUnit: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minimumStock">
                    Minimum Stock
                  </Label>

                  <Input
                    id="minimumStock"
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 10000"
                    value={form.minimumStock}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        minimumStock: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reorderLevel">
                    Reorder Level
                  </Label>

                  <Input
                    id="reorderLevel"
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 20000"
                    value={form.reorderLevel}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        reorderLevel: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>

                <Textarea
                  id="notes"
                  placeholder="Additional information..."
                  value={form.notes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      notes: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingMaterial
                      ? "Update Material"
                      : "Save Material"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>
              Materials ({filteredMaterials.length})
            </CardTitle>

            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                placeholder="Search materials..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">
              Loading raw materials...
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No raw materials found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Density</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredMaterials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">
                      {material.code}
                    </TableCell>

                    <TableCell>{material.name}</TableCell>

                    <TableCell>
                      {material.materialType.replaceAll("_", " ")}
                    </TableCell>

                    <TableCell>{material.unitType}</TableCell>

                    <TableCell>
                      {material.density
                        ? `${material.density} ${
                            material.densityUnit ?? ""
                          }`
                        : "—"}
                    </TableCell>

                    <TableCell>
                      {material.reorderLevel ?? "—"}
                    </TableCell>

                    <TableCell>
                      {material.isActive ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Badge variant="secondary">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            openEditDialog(material)
                          }
                        >
                          <Edit className="mr-1 h-4 w-4" />
                          Edit
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleStatus(material)
                          }
                        >
                          <Power className="mr-1 h-4 w-4" />
                          {material.isActive
                            ? "Deactivate"
                            : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}