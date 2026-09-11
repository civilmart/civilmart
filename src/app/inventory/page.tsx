"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  PackageX,
  RefreshCw,
  Search,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type InventoryItem = {
  id: string;
  code: string;
  name: string;
  materialType: string;
  unitType: string;
  minimumStock: number | null;
  reorderLevel: number | null;
  currentStock: number;
  totalPurchased: number;
  totalConsumed: number;
  totalAdjustments: number;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadInventory = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/inventory");
      const result = await response.json();

      if (result.success) {
        setInventory(result.data);
      }
    } catch (error) {
      console.error("Failed to load inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const filteredInventory = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) {
      return inventory;
    }

    return inventory.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        item.materialType.toLowerCase().includes(query)
    );
  }, [inventory, search]);

  const totalItems = inventory.length;

  const inStockCount = inventory.filter(
    (item) => item.stockStatus === "IN_STOCK"
  ).length;

  const lowStockCount = inventory.filter(
    (item) => item.stockStatus === "LOW_STOCK"
  ).length;

  const outOfStockCount = inventory.filter(
    (item) => item.stockStatus === "OUT_OF_STOCK"
  ).length;

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatMaterialType = (value: string) => {
    return value
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getUnitLabel = (item: InventoryItem) => {
    if (item.unitType === "WEIGHT") {
      return "G / KG";
    }

    if (item.unitType === "VOLUME") {
      return "ML / L";
    }

    return "PIECE";
  };

  const getStatusBadge = (status: InventoryItem["stockStatus"]) => {
    if (status === "IN_STOCK") {
      return (
        <Badge variant="outline" className="gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          In Stock
        </Badge>
      );
    }

    if (status === "LOW_STOCK") {
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          Low Stock
        </Badge>
      );
    }

    return (
      <Badge variant="destructive" className="gap-1">
        <PackageX className="h-3.5 w-3.5" />
        Out of Stock
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          </div>

          <p className="text-muted-foreground">
            Monitor raw material stock and inventory levels.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={loadInventory}
          disabled={loading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Materials
            </CardTitle>

            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">
              Active raw materials
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              In Stock
            </CardTitle>

            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">{inStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Healthy stock levels
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Low Stock
            </CardTitle>

            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Need replenishment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Out of Stock
            </CardTitle>

            <PackageX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">{outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">
              No available stock
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Raw Material Inventory</CardTitle>
              <p className="text-sm text-muted-foreground">
                Stock calculated from inventory transactions.
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                placeholder="Search materials..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              Loading inventory...
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              No inventory records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Raw Material</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Purchased</TableHead>
                    <TableHead>Consumed</TableHead>
                    <TableHead>Reorder Level</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredInventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.code}
                      </TableCell>

                      <TableCell>{item.name}</TableCell>

                      <TableCell>
                        {formatMaterialType(item.materialType)}
                      </TableCell>

                      <TableCell className="font-semibold">
                        {formatNumber(item.currentStock)}
                      </TableCell>

                      <TableCell>{getUnitLabel(item)}</TableCell>

                      <TableCell>
                        {formatNumber(item.totalPurchased)}
                      </TableCell>

                      <TableCell>
                        {formatNumber(item.totalConsumed)}
                      </TableCell>

                      <TableCell>
                        {item.reorderLevel !== null
                          ? formatNumber(item.reorderLevel)
                          : "—"}
                      </TableCell>

                      <TableCell>
                        {getStatusBadge(item.stockStatus)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}