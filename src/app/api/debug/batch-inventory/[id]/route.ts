import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: {
        materialConsumptions: {
          include: {
            rawMaterial: true,
            lot: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      );
    }

    const inventoryTransactions =
      await prisma.inventoryTransaction.findMany({
        where: {
          referenceType: "PRODUCTION_BATCH",
          referenceId: id,
        },
        include: {
          rawMaterial: true,
          lot: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    const result = batch.materialConsumptions.map(
      (consumption) => {
        const matchingTransactions =
          inventoryTransactions.filter(
            (transaction) =>
              transaction.rawMaterialId ===
                consumption.rawMaterialId &&
              transaction.lotId === consumption.lotId
          );

        const inventoryConsumed =
          matchingTransactions
            .filter(
              (transaction) =>
                transaction.transactionType ===
                "CONSUMPTION"
            )
            .reduce(
              (total, transaction) =>
                total + Number(transaction.quantity),
              0
            );

        return {
          rawMaterial: consumption.rawMaterial.name,
          rawMaterialId: consumption.rawMaterialId,

          lotNumber: consumption.lot?.lotNumber ?? null,
          lotId: consumption.lotId,

          productionConsumption: {
            quantity: Number(consumption.quantity),
            unit: consumption.unit,
            unitType: consumption.unitType,
          },

          inventoryTransactions:
            matchingTransactions.map((transaction) => ({
              id: transaction.id,
              type: transaction.transactionType,
              quantity: Number(transaction.quantity),
              unit: transaction.unit,
              unitType: transaction.unitType,
              createdAt: transaction.createdAt,
              referenceType:
                transaction.referenceType,
              referenceId:
                transaction.referenceId,
            })),

          inventoryConsumptionTotal:
            inventoryConsumed,

          MATCH:
            Math.abs(
              inventoryConsumed -
                Number(consumption.quantity)
            ) < 0.000001,
        };
      }
    );

    return NextResponse.json({
      batch: {
        id: batch.id,
        batchNumber: batch.batchNumber,
        status: batch.status,
      },

      productionConsumptions:
        batch.materialConsumptions.length,

      inventoryTransactions:
        inventoryTransactions.length,

      result,
    });
  } catch (error) {
    console.error(
      "Batch inventory diagnostic error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Diagnostic failed",
      },
      { status: 500 }
    );
  }
}