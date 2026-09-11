import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      rawMaterialId,
      lotId,
      adjustmentType,
      quantity,
      unit,
      reason,
      notes,
    } = body;

    if (
      !rawMaterialId ||
      !lotId ||
      !adjustmentType ||
      !quantity ||
      !unit ||
      !reason
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Raw material, lot, adjustment type, quantity, unit, and reason are required",
        },
        { status: 400 }
      );
    }

    if (
      adjustmentType !== "ADJUSTMENT_IN" &&
      adjustmentType !== "ADJUSTMENT_OUT"
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid adjustment type" },
        { status: 400 }
      );
    }

    const numericQuantity = Number(quantity);

    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      return NextResponse.json(
        { success: false, error: "Quantity must be greater than zero" },
        { status: 400 }
      );
    }

    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id: rawMaterialId },
    });

    if (!rawMaterial) {
      return NextResponse.json(
        { success: false, error: "Raw material not found" },
        { status: 404 }
      );
    }

    const lot = await prisma.rawMaterialLot.findUnique({
      where: { id: lotId },
    });

    if (!lot) {
      return NextResponse.json(
        { success: false, error: "Lot not found" },
        { status: 404 }
      );
    }

    if (lot.rawMaterialId !== rawMaterialId) {
      return NextResponse.json(
        {
          success: false,
          error: "Selected lot does not belong to the selected raw material",
        },
        { status: 400 }
      );
    }

    if (rawMaterial.unitType === "WEIGHT" && !["G", "KG"].includes(unit)) {
      return NextResponse.json(
        { success: false, error: "Invalid unit for weight-based material" },
        { status: 400 }
      );
    }

    if (rawMaterial.unitType === "VOLUME" && !["ML", "L"].includes(unit)) {
      return NextResponse.json(
        { success: false, error: "Invalid unit for volume-based material" },
        { status: 400 }
      );
    }

    if (rawMaterial.unitType === "PIECE" && unit !== "PIECE") {
      return NextResponse.json(
        { success: false, error: "Invalid unit for piece-based material" },
        { status: 400 }
      );
    }

    if (lot.unit !== unit) {
      return NextResponse.json(
        {
          success: false,
          error: `Adjustment unit must match the lot unit (${lot.unit})`,
        },
        { status: 400 }
      );
    }

    const transaction = await prisma.inventoryTransaction.create({
      data: {
        rawMaterialId,
        lotId,
        transactionType: adjustmentType,
        quantity: numericQuantity,
        unitType: rawMaterial.unitType,
        unit,
        referenceType: "INVENTORY_ADJUSTMENT",
        referenceId: lotId,
        notes: `${reason}${notes ? ` — ${notes}` : ""}`,
      },
      include: {
        rawMaterial: true,
        lot: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: transaction,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create inventory adjustment:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create inventory adjustment",
      },
      { status: 500 }
    );
  }
}