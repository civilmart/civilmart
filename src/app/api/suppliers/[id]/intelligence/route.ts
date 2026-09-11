import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: "Supplier not found" },
        { status: 404 }
      );
    }

    const [purchases, lots] = await Promise.all([
      prisma.purchase.findMany({
        where: { supplierId: id, status: { not: "CANCELLED" } },
        include: {
          items: {
            include: {
              rawMaterial: {
                select: { id: true, code: true, name: true },
              },
            },
          },
        },
        orderBy: { purchaseDate: "desc" },
      }),
      prisma.rawMaterialLot.findMany({
        where: { supplierId: id },
        include: {
          rawMaterial: {
            select: { id: true, code: true, name: true },
          },
        },
      }),
    ]);

    const totalSpend = purchases.reduce(
      (sum, purchase) => sum + Number(purchase.totalAmount),
      0
    );

    const purchaseCount = purchases.length;
    const avgOrderValue =
      purchaseCount > 0 ? totalSpend / purchaseCount : 0;

    const materialStats = new Map<
      string,
      {
        id: string;
        code: string;
        name: string;
        purchases: number;
        totalQty: number;
        totalCost: number;
        prices: { date: string; costPerUnit: number; purchaseNo: string }[];
      }
    >();

    for (const purchase of purchases) {
      for (const item of purchase.items) {
        const materialId = item.rawMaterialId;
        let stat = materialStats.get(materialId);

        if (!stat) {
          stat = {
            id: materialId,
            code: item.rawMaterial.code,
            name: item.rawMaterial.name,
            purchases: 0,
            totalQty: 0,
            totalCost: 0,
            prices: [],
          };
          materialStats.set(materialId, stat);
        }

        stat.purchases += 1;
        stat.totalQty += Number(item.quantity);
        stat.totalCost += Number(item.totalCost);
        stat.prices.push({
          date: purchase.purchaseDate.toISOString(),
          costPerUnit: Number(item.costPerUnit),
          purchaseNo: purchase.purchaseNo,
        });
      }
    }

    const materials = Array.from(materialStats.values()).map((stat) => ({
      ...stat,
      avgCostPerUnit:
        stat.totalQty > 0 ? stat.totalCost / stat.totalQty : 0,
      latestPrice:
        stat.prices.length > 0
          ? stat.prices[stat.prices.length - 1].costPerUnit
          : null,
      priceTrend:
        stat.prices.length >= 2
          ? stat.prices[stat.prices.length - 1].costPerUnit -
            stat.prices[0].costPerUnit
          : null,
    }));

    const suppliedMaterialIds = new Set(
      lots.map((lot) => lot.rawMaterialId)
    );

    const supplierRatings = await prisma.qualityControl.findMany({
      where: {
        productionBatch: {
          materialConsumptions: {
            some: {
              lot: { supplierId: id },
            },
          },
        },
      },
      select: {
        decision: true,
        productionBatch: {
          select: {
            materialConsumptions: {
              where: { lot: { supplierId: id } },
              select: {
                quantity: true,
                rawMaterialId: true,
              },
            },
          },
        },
      },
    });

    let qcApproved = 0;
    let qcRejected = 0;
    let qcTotal = 0;

    for (const record of supplierRatings) {
      qcTotal += 1;

      if (record.decision === "APPROVED") {
        qcApproved += 1;
      }

      if (record.decision === "REJECTED") {
        qcRejected += 1;
      }
    }

    const qcPassRate = qcTotal > 0 ? (qcApproved / qcTotal) * 100 : null;
    const qcRating =
      qcPassRate === null
        ? "NO_DATA"
        : qcPassRate >= 90
          ? "A"
          : qcPassRate >= 75
            ? "B"
            : qcPassRate >= 50
              ? "C"
              : "D";

    let bestVendor = null;

    if (suppliedMaterialIds.size > 0) {
      const comparisons = await prisma.purchaseItem.findMany({
        where: {
          rawMaterialId: { in: Array.from(suppliedMaterialIds) },
          purchase: {
            supplierId: { not: id },
            status: { not: "CANCELLED" },
          },
        },
        include: {
          rawMaterial: {
            select: { id: true, code: true, name: true },
          },
          purchase: {
            select: {
              supplier: { select: { name: true } },
            },
          },
        },
      });

      if (comparisons.length > 0) {
        const latestPrices = new Map<string, number | null>(
          materials.map((material) => [
            material.id,
            material.latestPrice,
          ])
        );

        bestVendor = {
          comparedItems: comparisons.length,
          cheaperOffers: comparisons.filter(
            (item) =>
              Number(item.costPerUnit) <
              (latestPrices.get(item.rawMaterialId) ?? Infinity)
          ).length,
          potentialSavings: comparisons.reduce((sum, item) => {
            const current = latestPrices.get(item.rawMaterialId);
            if (!current) return sum;
            if (Number(item.costPerUnit) >= current) return sum;
            return sum + (current - Number(item.costPerUnit));
          }, 0),
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        supplier: {
          id: supplier.id,
          name: supplier.name,
          contactName: supplier.contactName,
          email: supplier.email,
        },
        summary: {
          totalSpend,
          purchaseCount,
          avgOrderValue,
          qcPassRate,
          qcRating,
        },
        purchases: purchases.map((purchase) => ({
          id: purchase.id,
          purchaseNo: purchase.purchaseNo,
          purchaseDate: purchase.purchaseDate.toISOString(),
          status: purchase.status,
          totalAmount: Number(purchase.totalAmount),
          itemCount: purchase.items.length,
        })),
        materials,
        lots: lots.map((lot) => ({
          id: lot.id,
          lotNumber: lot.lotNumber,
          receivedAt: lot.receivedAt.toISOString(),
          expiryDate: lot.expiryDate?.toISOString() ?? null,
          quantity: Number(lot.receivedQty),
          unit: lot.unit,
          costPerUnit: Number(lot.costPerUnit ?? 0),
          totalCost: Number(lot.totalCost ?? 0),
          rawMaterial: lot.rawMaterial,
        })),
        qcSummary: {
          total: qcTotal,
          approved: qcApproved,
          rejected: qcRejected,
        },
        bestVendor,
      },
    });
  } catch (error) {
    console.error("Failed to fetch supplier intelligence:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch supplier intelligence" },
      { status: 500 }
    );
  }
}