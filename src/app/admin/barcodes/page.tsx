"use client";

import { useMemo, useState } from "react";
import { useEffect } from "react";
import JsBarcode from "jsbarcode";
import {
  Barcode,
  CheckSquare2,
  Printer,
  Search,
  Square,
  Tags,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";

type LabelProduct = {
  id: string;
  code: string;
  name: string;
  barcode: string | null;
  price: number | null;
  imageUrl: string | null;
};

export default function BarcodesPage() {
  const [products, setProducts] = useState<LabelProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/products?labelsOnly=true")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: LabelProduct[]) => setProducts(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    let list = products;

    if (term) {
      list = list.filter((product) =>
        [product.name, product.code, product.barcode ?? ""]
          .filter(Boolean)
          .some((value) => (value as string).toLowerCase().includes(term))
      );
    }

    if (showOnlyMissing) {
      list = list.filter((product) => !product.barcode);
    }

    return list;
  }, [products, search, showOnlyMissing]);

  const missingCount = useMemo(
    () => products.filter((product) => !product.barcode).length,
    [products]
  );

  function toggleAll() {
    const visibleIds = filtered.filter((p) => p.barcode).map((p) => p.id);

    const allSelected = visibleIds.every((id) => selected[id]);

    setSelected((current) => {
      const next = { ...current };

      for (const id of visibleIds) {
        if (allSelected) {
          next[id] = false;
        } else {
          next[id] = true;
        }
      }

      return next;
    });
  }

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  const selectedProducts = useMemo(
    () => products.filter((product) => product.barcode && selected[product.id]),
    [products, selected]
  );

  useEffect(() => {
    const canvases = document.querySelectorAll<HTMLCanvasElement>(
      "#print-area canvas[data-barcode]"
    );

    for (const canvas of canvases) {
      const barcode = canvas.getAttribute("data-barcode");

      if (!barcode) continue;

      JsBarcode(canvas, barcode, {
        format: "CODE128",
        width: 2,
        height: 44,
        fontSize: 14,
        displayValue: true,
        margin: 0,
      });
    }
  }, [selectedProducts]);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Tags className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Barcode Labels</h1>
          </div>
          <p className="mt-1 text-muted-foreground">
            Print shelf labels for physical items. Select products, then press{" "}
            <span className="font-medium">Print Labels</span>. Every product
            already has a unique barcode — same one you scan at the
            Invoice / POS screen.
          </p>
        </div>

        <Button
          onClick={() => window.print()}
          disabled={selectedCount === 0}
        >
          <Printer className="mr-2 h-4 w-4" />
          Print Labels
          {selectedCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedCount}
            </Badge>
          )}
        </Button>
      </div>

      {missingCount > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {missingCount}{" "}
          {missingCount === 1 ? "product has" : "products have"} no barcode
          yet. Fix them in the Products screen or check the box below to focus
          on them.
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>All Products</CardTitle>
            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
              <div className="relative md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search name, code or barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button
                variant={showOnlyMissing ? "default" : "outline"}
                onClick={() => setShowOnlyMissing((value) => !value)}
              >
                <Barcode className="mr-2 h-4 w-4" />
                Missing only ({missingCount})
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading products...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No products match.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="w-10 pb-2 pr-2">
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs font-medium text-muted-foreground"
                        onClick={toggleAll}
                      >
                        {filtered.every((p) => !p.barcode || selected[p.id]) ? (
                          <CheckSquare2 className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Product</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Code</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Barcode</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">Price</th>
                    <th className="w-10 pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => (
                    <tr key={product.id} className="border-b last:border-0">
                      <td className="py-2 pr-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelected((current) => ({
                              ...current,
                              [product.id]: !current[product.id],
                            }))
                          }
                        >
                          {selected[product.id] ? (
                            <CheckSquare2 className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-2 pr-4 font-medium">{product.name}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{product.code}</td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {product.barcode ?? <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {product.price !== null ? formatMoney(product.price) : "—"}
                      </td>
                      <td className="w-10 py-2" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProducts.length > 0 && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{selectedProducts.length}</span>{" "}
          selected — press <span className="font-medium">Print Labels</span> to
          print their shelf labels.
        </p>
      )}

      <div className="hidden print:block" id="print-area">
        <div className="flex flex-wrap gap-4 p-4">
          {selectedProducts.map((product) => (
            <div
              key={product.id}
              className="flex w-56 flex-col items-center justify-center gap-1 rounded border border-black p-2 text-center"
            >
              <p className="line-clamp-2 text-xs font-bold leading-tight">
                {product.name}
              </p>
              <p className="text-[10px]">{product.code}</p>
              <div className="flex w-full justify-center">
                <canvas
                  data-barcode={`${product.barcode}`}
                  className="max-w-full"
                />
              </div>
              {product.price !== null && (
                <p className="text-sm font-bold">{formatMoney(product.price)}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}