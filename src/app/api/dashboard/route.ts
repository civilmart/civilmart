import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDaysUntilExpiry, getExpiryStatus } from "@/lib/expiry";

export async function GET() {
  try {
    const now = new Date();

    const [
      activeMaterials,
      activeSuppliers,
      rawMaterials,
      transactions,
      purchaseOrders,
      batches,
      qcPending,
      expiryLots,
      recentPurchases,
      recentBatches,
    ] = await Promise.all([
      prisma.rawMaterial.count({ where: { isActive: true } }),
      prisma.supplier.count({ where: { isActive: true } }),
      prisma.rawMaterial.findMany({
        where: { isActive: true },
      }),
      prisma.inventoryTransaction.findMany({
        select: {
          rawMaterialId: true,
          lotId: true,
          transactionType: true,
          quantity: true,
        },
      }),
      prisma.purchaseOrder.findMany({
        where: {
          status: { notIn: ["RECEIVED", "CANCELLED"] },
        },
      }),
      prisma.productionBatch.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.qualityControl.count({ where: { decision: "PENDING" } }),
      prisma.rawMaterialLot.findMany({
        where: { expiryDate: { not: null } },
        include: {
          rawMaterial: { select: { id: true, code: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
      }),
      prisma.purchase.findMany({
        include: {
          supplier: { select: { name: true } },
        },
        orderBy: { purchaseDate: "desc" },
        take: 8,
      }),
      prisma.productionBatch.findMany({
        include: {
          product: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

    const stockByMaterial = new Map<string, number>();
    const balanceByLot = new Map<string, number>();

    for (const transaction of transactions) {
      const qty = Number(transaction.quantity);
      const isIncoming =
        transaction.transactionType === "PURCHASE" ||
        transaction.transactionType === "RETURN" ||
        transaction.transactionType === "TRANSFER_IN" ||
        transaction.transactionType === "OPENING_BALANCE" ||
        transaction.transactionType === "ADJUSTMENT_IN" ||
        transaction.transactionType === "CORRECTION";
      const delta = isIncoming ? qty : -qty;

      if (transaction.rawMaterialId) {
        stockByMaterial.set(
          transaction.rawMaterialId,
          (stockByMaterial.get(transaction.rawMaterialId) ?? 0) + delta
        );
      }

      if (transaction.lotId) {
        balanceByLot.set(
          transaction.lotId,
          (balanceByLot.get(transaction.lotId) ?? 0) + delta
        );
      }
    }

    const lowStockItems = [];
    const outOfStockItems = [];

    for (const material of rawMaterials) {
      const stock = stockByMaterial.get(material.id) ?? 0;

      if (stock <= 0) {
        outOfStockItems.push({
          id: material.id,
          code: material.code,
          name: material.name,
          currentStock: stock,
          reorderLevel: material.reorderLevel
            ? Number(material.reorderLevel)
            : null,
        });
      } else if (
        material.reorderLevel !== null &&
        stock <= Number(material.reorderLevel)
      ) {
        lowStockItems.push({
          id: material.id,
          code: material.code,
          name: material.name,
          currentStock: stock,
          reorderLevel: Number(material.reorderLevel),
        });
      }
    }

    const expiryAlerts = [];

    for (const lot of expiryLots) {
      if (!lot.expiryDate) continue;

      const status = getExpiryStatus(lot.expiryDate, now);

      if (status !== "EXPIRED" && status !== "EXPIRING_SOON") continue;

      const remainingQty = Math.max(balanceByLot.get(lot.id) ?? 0, 0);

      if (remainingQty <= 0) continue;

      expiryAlerts.push({
        id: lot.id,
        lotNumber: lot.lotNumber,
        expiryDate: lot.expiryDate,
        daysUntilExpiry: getDaysUntilExpiry(lot.expiryDate, now),
        status,
        rawMaterial: lot.rawMaterial,
        supplier: lot.supplier,
      });
    }

    expiryAlerts.sort(
      (a, b) => (a.daysUntilExpiry ?? 0) - (b.daysUntilExpiry ?? 0)
    );

    const statusCounts: Record<string, number> = {};
    for (const group of batches) {
      statusCounts[group.status] = group._count._all;
    }

    const activity = [
      ...recentPurchases.map((purchase) => ({
        id: purchase.id,
        type: "PURCHASE",
        title: `Purchase ${purchase.purchaseNo}`,
        detail: purchase.supplier?.name ?? "Unknown supplier",
        amount: Number(purchase.totalAmount),
        date: purchase.purchaseDate.toISOString(),
      })),
      ...recentBatches.map((batch) => ({
        id: batch.id,
        type: "PRODUCTION",
        title: `Batch ${batch.batchNumber}`,
        detail: batch.product.name,
        amount: null,
        date: batch.createdAt.toISOString(),
      })),
    ]
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          materials: activeMaterials,
          suppliers: activeSuppliers,
          lowStock: lowStockItems.length,
          outOfStock: outOfStockItems.length,
          openPurchaseOrders: purchaseOrders.length,
          batchesInProgress: statusCounts["IN_PROGRESS"] ?? 0,
          batchesCompleted: statusCounts["COMPLETED"] ?? 0,
          batchesReleased: statusCounts["RELEASED"] ?? 0,
          qcPending,
          expiredLots: expiryAlerts.filter(
            (a) => a.status === "EXPIRED"
          ).length,
          expiringSoon: expiryAlerts.filter(
            (a) => a.status === "EXPIRING_SOON"
          ).length,
        },
        lowStockItems: lowStockItems.slice(0, 8),
        outOfStockItems: outOfStockItems.slice(0, 8),
        expiryAlerts: expiryAlerts.slice(0, 8),
        batchStatusCounts: statusCounts,
        totalBatches: batches.reduce(
          (sum, group) => sum + group._count._all,
          0
        ),
        activity,
      },
    });
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}