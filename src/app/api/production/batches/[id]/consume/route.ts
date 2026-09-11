import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const unitsByType = {
  WEIGHT: ["G", "KG"],
  VOLUME: ["ML", "L"],
  PIECE: ["PIECE"],
} as const;

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const rawMaterialId = String(body.rawMaterialId ?? "").trim();
    const lotId = String(body.lotId ?? "").trim();
    const quantity = Number(body.quantity);
    const unit = String(body.unit ?? "").trim();

    if (!rawMaterialId) {
      return NextResponse.json(
        { error: "Raw material is required." },
        { status: 400 }
      );
    }

    if (!lotId) {
      return NextResponse.json(
        { error: "Raw material lot is required." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be greater than zero." },
        { status: 400 }
      );
    }

    const batch = await prisma.productionBatch.findUnique({
      where: {
        id,
      },
    });

    if (!batch) {
      return NextResponse.json(
        { error: "Production batch not found." },
        { status: 404 }
      );
    }

    if (batch.status === "DRAFT") {
      return NextResponse.json(
        { error: "Batch must be planned before consuming materials." },
        { status: 400 }
      );
    }

    if (batch.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Cannot consume material for a completed batch." },
        { status: 400 }
      );
    }

    if (batch.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot consume material for a cancelled batch." },
        { status: 400 }
      );
    }

    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: {
        id: rawMaterialId,
      },
    });

    if (!rawMaterial) {
      return NextResponse.json(
        { error: "Raw material not found." },
        { status: 404 }
      );
    }

    const allowedUnits =
      unitsByType[rawMaterial.unitType];

    if (!allowedUnits.includes(unit as never)) {
      return NextResponse.json(
        {
          error: `Invalid unit for this raw material. Allowed units: ${allowedUnits.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    const lot = await prisma.rawMaterialLot.findFirst({
      where: {
        id: lotId,
        rawMaterialId,
      },
    });

    if (!lot) {
      return NextResponse.json(
        { error: "Selected lot does not belong to this raw material." },
        { status: 400 }
      );
    }

    if (lot.unit !== unit) {
      return NextResponse.json(
        {
          error: `Consumption unit must match the lot unit (${lot.unit}).`,
        },
        { status: 400 }
      );
    }

    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        lotId,
      },
      select: {
        transactionType: true,
        quantity: true,
      },
    });

    let availableStock = 0;

    for (const transaction of transactions) {
      const qty = Number(transaction.quantity);

      switch (transaction.transactionType) {
        case "PURCHASE":
        case "RETURN":
        case "TRANSFER_IN":
        case "OPENING_BALANCE":
        case "ADJUSTMENT_IN":
          availableStock += qty;
          break;

        case "CONSUMPTION":
        case "TRANSFER_OUT":
        case "ADJUSTMENT_OUT":
          availableStock -= qty;
          break;

        case "CORRECTION":
          availableStock += qty;
          break;

        default:
          break;
      }
    }

    if (quantity > availableStock) {
      return NextResponse.json(
        {
          error: `Insufficient stock in lot ${lot.lotNumber}. Available: ${availableStock} ${lot.unit}.`,
        },
        { status: 400 }
      );
    }

    const unitType = rawMaterial.unitType;

    const result = await prisma.$transaction(
      async (tx) => {
        const consumption = await tx.materialConsumption.create({
          data: {
            productionBatchId: id,
            rawMaterialId,
            lotId,
            quantity,
            unitType,
            unit: lot.unit,
            notes: body.notes
              ? String(body.notes).trim()
              : null,
          },
          include: {
            rawMaterial: true,
            lot: true,
          },
        });

        const inventoryTransaction =
          await tx.inventoryTransaction.create({
            data: {
              rawMaterialId,
              lotId,
              transactionType: "CONSUMPTION",
              quantity,
              unitType,
              unit: lot.unit,
              referenceType: "PRODUCTION_BATCH",
              referenceId: id,
              notes: `Consumed for production batch ${batch.batchNumber}`,
            },
          });

        if (batch.status === "PLANNED") {
          await tx.productionBatch.update({
            where: {
              id,
            },
            data: {
              status: "IN_PROGRESS",
              startedAt: batch.startedAt ?? new Date(),
            },
          });
        }

        return {
          consumption,
          inventoryTransaction,
        };
      },
      {
        maxWait: 30000,
        timeout: 30000,
      }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to consume production material:", error);

    return NextResponse.json(
      { error: "Failed to consume production material." },
      { status: 500 }
    );
  }
}