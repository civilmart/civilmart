import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RecommendationResult = {
  id: string;
  code: string;
  name: string;
  currentStock: number;
  unitType: string;
  minimumStock: number | null;
  reorderLevel: number | null;
  consumedLast90Days: number;
  avgDailyConsumption: number;
  daysOfStockLeft: number | null;
  status: "OUT_OF_STOCK" | "LOW_STOCK";
  recommendedOrderQty: number;
  priority: "HIGH" | "MEDIUM";
};

type VendorSuggestion = {
  supplierId: string;
  name: string;
  avgPrice: number;
  orderCount: number;
  qcPassRate: number | null;
};

type MaterialVendorSuggestion = {
  materialId: string;
  vendors: VendorSuggestion[];
  bestVendor: VendorSuggestion | null;
};

export async function GET() {
  try {
    const materials = await prisma.rawMaterial.findMany({
      where: { isActive: true },
      include: {
        inventoryTransactions: {
          select: {
            transactionType: true,
            quantity: true,
            createdAt: true,
          },
        },
      },
    });

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const recommendations: RecommendationResult[] = [];

    for (const material of materials) {
      let currentStock = 0;
      let consumedLast90Days = 0;

      for (const tx of material.inventoryTransactions) {
        const qty = Number(tx.quantity);

        switch (tx.transactionType) {
          case "PURCHASE":
          case "RETURN":
          case "TRANSFER_IN":
          case "OPENING_BALANCE":
          case "ADJUSTMENT_IN":
          case "CORRECTION":
            currentStock += qty;
            break;
          case "CONSUMPTION":
          case "TRANSFER_OUT":
          case "ADJUSTMENT_OUT":
            currentStock -= qty;
            if (
              tx.transactionType === "CONSUMPTION" &&
              tx.createdAt >= ninetyDaysAgo
            ) {
              consumedLast90Days += qty;
            }
            break;
          default:
            break;
        }
      }

      const reorderLevel = material.reorderLevel
        ? Number(material.reorderLevel)
        : null;

      const recommendedOrderQty = Math.max(
        reorderLevel ?? 0,
        Math.max(consumedLast90Days, 1000)
      );

      if (currentStock <= 0) {
        recommendations.push({
          id: material.id,
          code: material.code,
          name: material.name,
          currentStock,
          unitType: material.unitType,
          minimumStock: material.minimumStock
            ? Number(material.minimumStock)
            : null,
          reorderLevel,
          consumedLast90Days,
          avgDailyConsumption: consumedLast90Days / 90,
          daysOfStockLeft:
            consumedLast90Days > 0
              ? currentStock / (consumedLast90Days / 90)
              : null,
          status: "OUT_OF_STOCK",
          recommendedOrderQty,
          priority: "HIGH",
        });
        continue;
      }

      if (reorderLevel !== null && currentStock <= reorderLevel) {
        const daysOfStockLeft =
          consumedLast90Days > 0
            ? currentStock / (consumedLast90Days / 90)
            : null;
        const isCritical = daysOfStockLeft !== null && daysOfStockLeft < 14;

        recommendations.push({
          id: material.id,
          code: material.code,
          name: material.name,
          currentStock,
          unitType: material.unitType,
          minimumStock: material.minimumStock
            ? Number(material.minimumStock)
            : null,
          reorderLevel,
          consumedLast90Days,
          avgDailyConsumption: consumedLast90Days / 90,
          daysOfStockLeft,
          status: "LOW_STOCK",
          recommendedOrderQty,
          priority: isCritical ? "HIGH" : "MEDIUM",
        });
      }
    }

    const priorityMap: Record<RecommendationResult["priority"], number> = {
      HIGH: 0,
      MEDIUM: 1,
    };
    recommendations.sort(
      (a, b) => priorityMap[a.priority] - priorityMap[b.priority]
    );

    const recommendationIds = recommendations.map((r) => r.id);

    let vendorSuggestions: MaterialVendorSuggestion[] = [];

    if (recommendationIds.length > 0) {
      const priced = await prisma.purchaseItem.findMany({
        where: {
          rawMaterialId: { in: recommendationIds },
        },
        include: {
          purchase: {
            select: {
              supplier: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { purchaseId: "desc" },
      });

      const materialVendorPrices = new Map<string, Map<string, number[]>>();

      for (const item of priced) {
        if (!item.purchase.supplier) continue;

        const materialId = item.rawMaterialId;
        const supplierId = item.purchase.supplier.id;

        if (!materialVendorPrices.has(materialId)) {
          materialVendorPrices.set(materialId, new Map());
        }

        const supplierMap = materialVendorPrices.get(materialId)!;

        if (!supplierMap.has(supplierId)) {
          supplierMap.set(supplierId, []);
        }

        supplierMap.get(supplierId)!.push(Number(item.costPerUnit));
      }

      const supplierNames = new Map<string, string>();
      const lotSuppliers = await prisma.rawMaterialLot.findMany({
        where: {
          rawMaterialId: { in: recommendationIds },
          supplierId: { not: null },
          costPerUnit: { not: null },
        },
        select: {
          rawMaterialId: true,
          supplier: { select: { id: true, name: true } },
          costPerUnit: true,
        },
      });

      for (const lot of lotSuppliers) {
        const supplier = lot.supplier;
        if (!supplier) continue;

        supplierNames.set(supplier.id, supplier.name);

        if (!materialVendorPrices.has(lot.rawMaterialId)) {
          materialVendorPrices.set(lot.rawMaterialId, new Map());
        }

        const supplierMap = materialVendorPrices.get(lot.rawMaterialId)!;

        if (!supplierMap.has(supplier.id)) {
          supplierMap.set(supplier.id, []);
        }

        supplierMap.get(supplier.id)!.push(Number(lot.costPerUnit));
      }

      const supplierIds = new Set<string>();
      for (const [, vendorMap] of materialVendorPrices) {
        for (const supplierId of vendorMap.keys()) {
          supplierIds.add(supplierId);
        }
      }

      const qcRates = await prisma.qualityControl.findMany({
        where: {
          productionBatch: {
            materialConsumptions: {
              some: {
                lot: {
                  supplierId: { in: Array.from(supplierIds) },
                },
              },
            },
          },
        },
        select: {
          decision: true,
          productionBatch: {
            select: {
              materialConsumptions: {
                where: {
                  lot: {
                    supplierId: { in: Array.from(supplierIds) },
                  },
                },
                select: { lot: { select: { supplierId: true } } },
              },
            },
          },
        },
      });

      const supplierQcTotals = new Map<
        string,
        { total: number; approved: number }
      >();

      for (const record of qcRates) {
        const uniqueSuppliers = new Set(
          record.productionBatch.materialConsumptions
            .map((consumption) =>
              consumption.lot?.supplierId ?? null
            )
            .filter((s): s is string => s !== null)
        );

        for (const supplierId of uniqueSuppliers) {
          const totals =
            supplierQcTotals.get(supplierId) ?? {
              total: 0,
              approved: 0,
            };
          totals.total += 1;
          if (record.decision === "APPROVED") totals.approved += 1;
          supplierQcTotals.set(supplierId, totals);
        }
      }

      vendorSuggestions = Array.from(materialVendorPrices.entries()).map(
        ([materialId, supplierMap]) => {
          const vendors: VendorSuggestion[] = Array.from(
            supplierMap.entries()
          )
            .map(([supplierId, prices]) => {
              const avg =
                prices.reduce((a, b) => a + b, 0) / prices.length;
              const qc = supplierQcTotals.get(supplierId);
              const passRate = qc
                ? (qc.approved / qc.total) * 100
                : null;
              return {
                supplierId,
                name: supplierNames.get(supplierId) ?? "Unknown",
                avgPrice: avg,
                orderCount: prices.length,
                qcPassRate: passRate,
              };
            })
            .sort((a, b) => {
              if (
                a.qcPassRate !== null &&
                b.qcPassRate !== null &&
                b.qcPassRate !== a.qcPassRate
              ) {
                return b.qcPassRate - a.qcPassRate;
              }
              return a.avgPrice - b.avgPrice;
            });

          return {
            materialId,
            vendors,
            bestVendor: vendors[0] ?? null,
          };
        }
      );
    }

    const result = recommendations.map((rec) => {
      const suggestion = vendorSuggestions.find(
        (s) => s.materialId === rec.id
      );
      return { ...rec, vendorSuggestions: suggestion?.vendors ?? [] };
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Failed to fetch recommendations:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}