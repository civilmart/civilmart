import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const OUTGOING = new Set([
  "SALE",
  "PURCHASE_RETURN",
  "TRANSFER_OUT",
  "ADJUSTMENT_OUT",
]);

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q");
    const categoryId = url.searchParams.get("categoryId");
    const status = url.searchParams.get("status");

    const [products, transactions] = await Promise.all([
      prisma.product.findMany({
        where: {
          status: "ACTIVE",
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { code: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
          ...(categoryId ? { categoryId } : {}),
        },
        include: {
          category: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.inventoryTransaction.findMany({
        select: {
          productId: true,
          transactionType: true,
          quantity: true,
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const ledger = new Map<string, Map<string, number>>();

    for (const tx of transactions) {
      if (!tx.productId) continue;

      let productLedger = ledger.get(tx.productId);

      if (!productLedger) {
        productLedger = new Map();
        ledger.set(tx.productId, productLedger);
      }

      productLedger.set(
        tx.transactionType,
        (productLedger.get(tx.transactionType) ?? 0) + Number(tx.quantity)
      );
    }

    const inventory = products.map((product) => {
      const productLedger = ledger.get(product.id) ?? new Map<string, number>();

      let currentStock = 0;
      let totalPurchased = 0;
      let totalSold = 0;
      let totalAdjustments = 0;

      for (const [type, quantity] of productLedger) {
        const signed = OUTGOING.has(type) ? -quantity : quantity;

        currentStock += signed;

        if (type === "PURCHASE" || type === "PURCHASE_RETURN") {
          totalPurchased += type === "PURCHASE" ? quantity : -quantity;
        } else if (type === "SALE" || type === "SALE_RETURN") {
          totalSold += type === "SALE" ? quantity : -quantity;
        } else if (type === "ADJUSTMENT_IN" || type === "ADJUSTMENT_OUT") {
          totalAdjustments += type === "ADJUSTMENT_IN" ? quantity : -quantity;
        }
      }

      const minimumStock =
        product.minimumStock !== null ? Number(product.minimumStock) : null;
      const reorderLevel =
        product.reorderLevel !== null ? Number(product.reorderLevel) : null;

      let stockStatus = "IN_STOCK";

      if (currentStock <= 0) {
        stockStatus = "OUT_OF_STOCK";
      } else if (
        reorderLevel !== null &&
        currentStock <= reorderLevel
      ) {
        stockStatus = "LOW_STOCK";
      }

      if (status && stockStatus !== status) {
        return null;
      }

      return {
        id: product.id,
        code: product.code,
        name: product.name,
        unit: product.unit,
        brand: product.brand,
        category: product.category?.name ?? null,
        categoryId: product.categoryId,
        minimumStock,
        maximumStock:
          product.maximumStock !== null
            ? Number(product.maximumStock)
            : null,
        reorderLevel,
        currentStock,
        totalPurchased,
        totalSold,
        totalAdjustments,
        stockStatus,
      };
    });

    return NextResponse.json({
      success: true,
      data: inventory.filter((row): row is NonNullable<typeof row> => row !== null),
    });
  } catch (error) {
    console.error("Failed to fetch inventory:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}