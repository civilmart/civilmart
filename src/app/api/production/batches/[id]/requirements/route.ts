import { NextResponse } from "next/server";
import {
  calculateBatchRequirements,
  convertQuantity,
  getLotAvailableQuantity,
  type InventoryUnit,
} from "@/lib/production";
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
        formulaVersion: true,
      },
    });

    if (!batch) {
      return NextResponse.json(
        { error: "Production batch not found." },
        { status: 404 }
      );
    }

    const calculation = await calculateBatchRequirements(id);

    const requirements = await Promise.all(
      calculation.requirements.map(async (requirement) => {
        const lots = await prisma.rawMaterialLot.findMany({
          where: {
            rawMaterialId: requirement.rawMaterialId,
          },
          orderBy: [
            { expiryDate: "asc" },
            { receivedAt: "asc" },
          ],
        });

        let availableQuantity = 0;

        for (const lot of lots) {
          const lotAvailable = await getLotAvailableQuantity(
            lot.id
          );

          if (lotAvailable <= 0) continue;

          try {
            availableQuantity += convertQuantity(
              lotAvailable,
              lot.unit as InventoryUnit,
              requirement.requiredUnit as InventoryUnit
            );
          } catch {
            // Different measurement families cannot be converted.
          }
        }

        const remainingQuantity =
          requirement.remainingQuantity;

        let status:
          | "READY"
          | "PARTIAL"
          | "INSUFFICIENT"
          | "CONSUMED";

        if (remainingQuantity <= 0.000001) {
          status = "CONSUMED";
        } else if (
          availableQuantity >= remainingQuantity
        ) {
          status = "READY";
        } else if (availableQuantity > 0) {
          status = "PARTIAL";
        } else {
          status = "INSUFFICIENT";
        }

        return {
          ...requirement,
          availableQuantity,
          availableUnit: requirement.requiredUnit,
          status,
        };
      })
    );

    const allConsumed = requirements.every(
      (item) => item.status === "CONSUMED"
    );

    const canConsume = requirements.some(
      (item) => item.status !== "CONSUMED"
    );

    const hasShortage = requirements.some(
      (item) => item.status === "INSUFFICIENT"
    );

    return NextResponse.json({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      plannedQuantity: calculation.plannedQuantity,
      plannedUnit: calculation.plannedUnit,
      formulaBatchSize: calculation.formulaBatchSize,
      formulaBatchUnit: calculation.formulaBatchUnit,
      requirements,
      allConsumed,
      canConsume,
      hasShortage,
    });
  } catch (error) {
    console.error(
      "Production requirements error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to calculate production requirements.",
      },
      { status: 500 }
    );
  }
}