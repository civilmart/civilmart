import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calculateBatchRequirements,
  convertQuantity,
  getLotAvailableQuantity,
  type InventoryUnit,
} from "@/lib/production";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: {
        formulaVersion: {
          include: {
            ingredients: {
              include: {
                rawMaterial: true,
              },
            },
          },
        },
        materialConsumptions: true,
      },
    });

    if (!batch) {
      return NextResponse.json(
        { error: "Production batch not found." },
        { status: 404 }
      );
    }

    if (
      batch.status === "COMPLETED" ||
      batch.status === "CANCELLED"
    ) {
      return NextResponse.json(
        {
          error:
            "Materials cannot be consumed for a completed or cancelled batch.",
        },
        { status: 400 }
      );
    }

    const requirements = await calculateBatchRequirements(id);

    const shortages: Array<{
      rawMaterialId: string;
      rawMaterialName: string;
      required: number;
      unit: string;
      available: number;
    }> = [];

    const consumptionPlan: Array<{
      rawMaterialId: string;
      rawMaterialName: string;
      ingredientUnit: InventoryUnit;
      quantity: number;
      lotId: string;
      lotNumber: string;
      lotUnit: InventoryUnit;
    }> = [];

    for (const requirement of requirements.requirements) {
      if (requirement.remainingQuantity <= 0.000001) {
        continue;
      }

      const rawMaterial = await prisma.rawMaterial.findUnique({
        where: {
          id: requirement.rawMaterialId,
        },
      });

      if (!rawMaterial) {
        return NextResponse.json(
          {
            error: `Raw material ${requirement.rawMaterialName} no longer exists.`,
          },
          { status: 400 }
        );
      }

      const lots = await prisma.rawMaterialLot.findMany({
        where: {
          rawMaterialId: requirement.rawMaterialId,
        },
        orderBy: [
          { expiryDate: "asc" },
          { receivedAt: "asc" },
        ],
      });

      let remaining = requirement.remainingQuantity;
      let totalAvailable = 0;

      for (const lot of lots) {
        const availableInLot = await getLotAvailableQuantity(lot.id);

        if (availableInLot <= 0) {
          continue;
        }

        let availableInIngredientUnit: number;

        try {
          availableInIngredientUnit = convertQuantity(
            availableInLot,
            lot.unit as InventoryUnit,
            requirement.requiredUnit
          );
        } catch {
          continue;
        }

        totalAvailable += availableInIngredientUnit;

        if (remaining <= 0.000001) {
          break;
        }

        const consumeInIngredientUnit = Math.min(
          remaining,
          availableInIngredientUnit
        );

        const consumeInLotUnit = convertQuantity(
          consumeInIngredientUnit,
          requirement.requiredUnit,
          lot.unit as InventoryUnit
        );

        consumptionPlan.push({
          rawMaterialId: requirement.rawMaterialId,
          rawMaterialName: requirement.rawMaterialName,
          ingredientUnit: requirement.requiredUnit,
          quantity: consumeInLotUnit,
          lotId: lot.id,
          lotNumber: lot.lotNumber,
          lotUnit: lot.unit as InventoryUnit,
        });

        remaining -= consumeInIngredientUnit;
      }

      if (remaining > 0.000001) {
        shortages.push({
          rawMaterialId: requirement.rawMaterialId,
          rawMaterialName: requirement.rawMaterialName,
          required: requirement.remainingQuantity,
          unit: requirement.requiredUnit,
          available: totalAvailable,
        });
      }
    }

    if (shortages.length > 0) {
      return NextResponse.json(
        {
          error:
            "Insufficient raw-material stock. No materials were consumed.",
          shortages,
        },
        { status: 409 }
      );
    }

    if (consumptionPlan.length === 0) {
      return NextResponse.json({
        message: "All required materials have already been consumed.",
        batch,
      });
    }

    const updatedBatch = await prisma.$transaction(
      async (tx) => {
        for (const item of consumptionPlan) {
          await tx.materialConsumption.create({
            data: {
              productionBatchId: id,
              rawMaterialId: item.rawMaterialId,
              lotId: item.lotId,
              quantity: item.quantity,
              unitType:
                item.lotUnit === "G" ||
                item.lotUnit === "KG"
                  ? "WEIGHT"
                  : item.lotUnit === "ML" ||
                    item.lotUnit === "L"
                    ? "VOLUME"
                    : "PIECE",
              unit: item.lotUnit,
              notes: `Automatic formula consumption from lot ${item.lotNumber}`,
            },
          });

          await tx.inventoryTransaction.create({
            data: {
              rawMaterialId: item.rawMaterialId,
              lotId: item.lotId,
              transactionType: "CONSUMPTION",
              quantity: item.quantity,
              unitType:
                item.lotUnit === "G" ||
                item.lotUnit === "KG"
                  ? "WEIGHT"
                  : item.lotUnit === "ML" ||
                    item.lotUnit === "L"
                    ? "VOLUME"
                    : "PIECE",
              unit: item.lotUnit,
              referenceType: "PRODUCTION_BATCH",
              referenceId: id,
              notes: `Automatic production consumption for batch ${batch.batchNumber}`,
            },
          });
        }

        return tx.productionBatch.update({
          where: { id },
          data: {
            status:
              batch.status === "PLANNED"
                ? "IN_PROGRESS"
                : batch.status,
            startedAt:
              batch.startedAt ?? new Date(),
          },
          include: {
            product: true,
            productVariant: true,
            formula: true,
            formulaVersion: {
              include: {
                ingredients: {
                  include: {
                    rawMaterial: true,
                  },
                },
              },
            },
            materialConsumptions: {
              include: {
                rawMaterial: true,
                lot: true,
              },
            },
          },
        });
      },
      {
        maxWait: 30000,
        timeout: 30000,
      }
    );

    return NextResponse.json({
      message: "Required materials consumed successfully.",
      batch: updatedBatch,
      consumed: consumptionPlan,
    });
  } catch (error) {
    console.error(
      "Automatic production consumption error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to consume production materials.",
      },
      { status: 500 }
    );
  }
}