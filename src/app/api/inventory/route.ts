import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rawMaterials = await prisma.rawMaterial.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const transactions = await prisma.inventoryTransaction.findMany({
      select: {
        rawMaterialId: true,
        transactionType: true,
        quantity: true,
        unitType: true,
        unit: true,
      },
    });

    const inventory = rawMaterials.map((material) => {
      const materialTransactions = transactions.filter(
        (transaction) => transaction.rawMaterialId === material.id
      );

      let currentStock = 0;
      let totalPurchased = 0;
      let totalConsumed = 0;
      let totalAdjustments = 0;

      for (const transaction of materialTransactions) {
        const quantity = Number(transaction.quantity);

        switch (transaction.transactionType) {
          case "PURCHASE":
          case "RETURN":
          case "TRANSFER_IN":
          case "OPENING_BALANCE":
            currentStock += quantity;

            if (transaction.transactionType === "PURCHASE") {
              totalPurchased += quantity;
            }

            break;

          case "CONSUMPTION":
          case "TRANSFER_OUT":
          case "ADJUSTMENT_OUT":
            currentStock -= quantity;

            if (transaction.transactionType === "CONSUMPTION") {
              totalConsumed += quantity;
            }

            if (transaction.transactionType === "ADJUSTMENT_OUT") {
              totalAdjustments -= quantity;
            }

            break;

          case "ADJUSTMENT_IN":
            currentStock += quantity;
            totalAdjustments += quantity;
            break;

          case "CORRECTION":
            currentStock += quantity;
            break;

          default:
            break;
        }
      }

      let stockStatus = "IN_STOCK";

      if (currentStock <= 0) {
        stockStatus = "OUT_OF_STOCK";
      } else if (
        material.reorderLevel !== null &&
        currentStock <= Number(material.reorderLevel)
      ) {
        stockStatus = "LOW_STOCK";
      }

      return {
        id: material.id,
        code: material.code,
        name: material.name,
        materialType: material.materialType,
        unitType: material.unitType,
        minimumStock: material.minimumStock
          ? Number(material.minimumStock)
          : null,
        reorderLevel: material.reorderLevel
          ? Number(material.reorderLevel)
          : null,
        currentStock,
        totalPurchased,
        totalConsumed,
        totalAdjustments,
        stockStatus,
      };
    });

    return NextResponse.json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error("Failed to fetch inventory:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch inventory",
      },
      { status: 500 }
    );
  }
}