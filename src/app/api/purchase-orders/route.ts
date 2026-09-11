import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PreparedItem = {
  rawMaterialId: string;
  quantity: number;
  unitType: "WEIGHT" | "VOLUME" | "PIECE";
  unit: "G" | "KG" | "ML" | "L" | "PIECE";
  estimatedCostPerUnit: number | null;
  notes: string | null;
};

function isValidUnit(
  unitType: "WEIGHT" | "VOLUME" | "PIECE",
  unit: string
) {
  if (unitType === "WEIGHT") return unit === "G" || unit === "KG";
  if (unitType === "VOLUME") return unit === "ML" || unit === "L";
  return unit === "PIECE";
}

// GET - list purchase orders
export async function GET() {
  try {
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        items: {
          include: {
            rawMaterial: true,
          },
        },
      },
      orderBy: {
        orderDate: "desc",
      },
    });

    return NextResponse.json(purchaseOrders);
  } catch (error) {
    console.error("GET purchase orders error:", error);

    return NextResponse.json(
      { error: "Failed to fetch purchase orders" },
      { status: 500 }
    );
  }
}

// POST - create purchase order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      poNumber,
      supplierId,
      orderDate,
      expectedDate,
      items,
      notes,
    } = body;

    if (!poNumber?.trim()) {
      return NextResponse.json(
        { error: "PO number is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one purchase order item is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.purchaseOrder.findUnique({
      where: { poNumber: poNumber.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "PO number already exists" },
        { status: 409 }
      );
    }

    const preparedItems: PreparedItem[] = [];

    for (const item of items) {
      if (!item.rawMaterialId) {
        return NextResponse.json(
          { error: "Each item requires a raw material" },
          { status: 400 }
        );
      }

      const quantity = Number(item.quantity);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json(
          { error: "Each item must have a valid quantity greater than zero" },
          { status: 400 }
        );
      }

      const rawMaterial = await prisma.rawMaterial.findUnique({
        where: {
          id: item.rawMaterialId,
        },
      });

      if (!rawMaterial) {
        return NextResponse.json(
          { error: "Raw material not found" },
          { status: 404 }
        );
      }

      const unit = String(item.unit);

      if (!isValidUnit(rawMaterial.unitType, unit)) {
        return NextResponse.json(
          {
            error: `Invalid unit ${unit} for ${rawMaterial.name}`,
          },
          { status: 400 }
        );
      }

      let estimatedCostPerUnit: number | null = null;

      if (
        item.estimatedCostPerUnit !== undefined &&
        item.estimatedCostPerUnit !== null &&
        item.estimatedCostPerUnit !== ""
      ) {
        estimatedCostPerUnit = Number(item.estimatedCostPerUnit);

        if (
          !Number.isFinite(estimatedCostPerUnit) ||
          estimatedCostPerUnit < 0
        ) {
          return NextResponse.json(
            {
              error: `Invalid estimated cost for ${rawMaterial.name}`,
            },
            { status: 400 }
          );
        }
      }

      preparedItems.push({
        rawMaterialId: item.rawMaterialId,
        quantity,
        unitType: rawMaterial.unitType,
        unit: unit as PreparedItem["unit"],
        estimatedCostPerUnit,
        notes: item.notes?.trim() || null,
      });
    }

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        poNumber: poNumber.trim(),
        supplierId: supplierId || null,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        status: "DRAFT",
        notes: notes?.trim() || null,
        items: {
          create: preparedItems,
        },
      },
      include: {
        supplier: true,
        items: {
          include: {
            rawMaterial: true,
          },
        },
      },
    });

    return NextResponse.json(purchaseOrder, { status: 201 });
  } catch (error) {
    console.error("POST purchase order error:", error);

    return NextResponse.json(
      { error: "Failed to create purchase order" },
      { status: 500 }
    );
  }
}