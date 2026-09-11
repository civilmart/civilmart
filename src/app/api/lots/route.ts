import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const lots = await prisma.rawMaterialLot.findMany({
      include: {
        rawMaterial: true,
        supplier: true,
      },
      orderBy: {
        receivedAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: lots,
    });
  } catch (error) {
    console.error("Failed to fetch lots:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch lots",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      rawMaterialId,
      supplierId,
      lotNumber,
      receivedAt,
      expiryDate,
      receivedQty,
      unitType,
      unit,
      costPerUnit,
      totalCost,
      notes,
    } = body;

    if (
      !rawMaterialId ||
      !lotNumber ||
      !receivedQty ||
      !unitType ||
      !unit
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Raw material, lot number, quantity, unit type, and unit are required",
        },
        { status: 400 }
      );
    }

    const quantity = Number(receivedQty);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Received quantity must be greater than zero",
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const lot = await tx.rawMaterialLot.create({
          data: {
            rawMaterialId,
            supplierId: supplierId || null,
            lotNumber,
            receivedAt: receivedAt
              ? new Date(receivedAt)
              : new Date(),
            expiryDate: expiryDate
              ? new Date(expiryDate)
              : null,
            receivedQty: quantity,
            unitType,
            unit,
            costPerUnit: costPerUnit
              ? Number(costPerUnit)
              : null,
            totalCost: totalCost
              ? Number(totalCost)
              : null,
            notes: notes || null,
          },
          include: {
            rawMaterial: true,
            supplier: true,
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            rawMaterialId,
            lotId: lot.id,
            transactionType: "PURCHASE",
            quantity,
            unitType,
            unit,
            referenceType: "RAW_MATERIAL_LOT",
            referenceId: lot.id,
            notes: `Initial receipt for lot ${lotNumber}`,
          },
        });

        return lot;
      },
      {
        maxWait: 30000,
        timeout: 30000,
      }
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create lot:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create lot",
      },
      { status: 500 }
    );
  }
}