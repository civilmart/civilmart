import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PreparedPurchaseItem = {
  rawMaterialId: string;
  quantity: number;
  unitType: "WEIGHT" | "VOLUME" | "PIECE";
  unit: "G" | "KG" | "ML" | "L" | "PIECE";
  costPerUnit: number;
  totalCost: number;
  notes: string | null;
};

export async function GET() {
  try {
    const purchases = await prisma.purchase.findMany({
      include: {
        supplier: true,
        items: {
          include: {
            rawMaterial: true,
            lot: true,
          },
        },
      },
      orderBy: {
        purchaseDate: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: purchases,
    });
  } catch (error) {
    console.error("Failed to fetch purchases:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch purchases",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      purchaseNo,
      supplierId,
      purchaseDate,
      items,
      tax = 0,
      discount = 0,
      notes,
    } = body;

    if (!purchaseNo || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Purchase number and at least one item are required",
        },
        { status: 400 }
      );
    }

    const existingPurchase = await prisma.purchase.findUnique({
      where: {
        purchaseNo,
      },
    });

    if (existingPurchase) {
      return NextResponse.json(
        {
          success: false,
          error: "Purchase number already exists",
        },
        { status: 400 }
      );
    }

    const numericTax = Number(tax) || 0;
    const numericDiscount = Number(discount) || 0;

    if (numericTax < 0 || numericDiscount < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Tax and discount cannot be negative",
        },
        { status: 400 }
      );
    }

    const preparedItems: PreparedPurchaseItem[] = [];

    for (const item of items) {
      const {
        rawMaterialId,
        quantity,
        unit,
        costPerUnit,
        notes: itemNotes,
      } = item;

      if (
        !rawMaterialId ||
        !quantity ||
        !unit ||
        costPerUnit === undefined
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Each purchase item requires raw material, quantity, unit, and cost per unit",
          },
          { status: 400 }
        );
      }

      const numericQuantity = Number(quantity);
      const numericCost = Number(costPerUnit);

      if (
        !Number.isFinite(numericQuantity) ||
        numericQuantity <= 0 ||
        !Number.isFinite(numericCost) ||
        numericCost < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid quantity or cost per unit",
          },
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
          {
            success: false,
            error: `Raw material not found: ${rawMaterialId}`,
          },
          { status: 404 }
        );
      }

      const unitType = rawMaterial.unitType;

      if (
        unitType === "WEIGHT" &&
        !["G", "KG"].includes(unit)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid unit for ${rawMaterial.name}. Use G or KG.`,
          },
          { status: 400 }
        );
      }

      if (
        unitType === "VOLUME" &&
        !["ML", "L"].includes(unit)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid unit for ${rawMaterial.name}. Use ML or L.`,
          },
          { status: 400 }
        );
      }

      if (unitType === "PIECE" && unit !== "PIECE") {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid unit for ${rawMaterial.name}. Use PIECE.`,
          },
          { status: 400 }
        );
      }

      const totalCost = numericQuantity * numericCost;

      preparedItems.push({
        rawMaterialId,
        quantity: numericQuantity,
        unitType,
        unit,
        costPerUnit: numericCost,
        totalCost,
        notes: itemNotes || null,
      });
    }

    const subtotal = preparedItems.reduce(
      (sum, item) => sum + item.totalCost,
      0
    );

    const totalAmount =
      subtotal + numericTax - numericDiscount;

    if (totalAmount < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Total purchase amount cannot be negative",
        },
        { status: 400 }
      );
    }

    const purchase = await prisma.$transaction(
      async (tx) => {
        const createdPurchase = await tx.purchase.create({
          data: {
            purchaseNo,
            supplierId: supplierId || null,
            purchaseDate: purchaseDate
              ? new Date(purchaseDate)
              : new Date(),
            status: "RECEIVED",
            subtotal,
            tax: numericTax,
            discount: numericDiscount,
            totalAmount,
            notes: notes || null,
          },
        });

        for (const item of preparedItems) {
          const lotNumber = `${purchaseNo}-${item.rawMaterialId.slice(-6)}`;

          const lot = await tx.rawMaterialLot.create({
            data: {
              rawMaterialId: item.rawMaterialId,
              supplierId: supplierId || null,
              lotNumber,
              receivedAt: purchaseDate
                ? new Date(purchaseDate)
                : new Date(),
              receivedQty: item.quantity,
              unitType: item.unitType,
              unit: item.unit,
              costPerUnit: item.costPerUnit,
              totalCost: item.totalCost,
              notes: item.notes,
            },
          });

          await tx.purchaseItem.create({
            data: {
              purchaseId: createdPurchase.id,
              rawMaterialId: item.rawMaterialId,
              lotId: lot.id,
              quantity: item.quantity,
              unitType: item.unitType,
              unit: item.unit,
              costPerUnit: item.costPerUnit,
              totalCost: item.totalCost,
              notes: item.notes,
            },
          });

          await tx.inventoryTransaction.create({
            data: {
              rawMaterialId: item.rawMaterialId,
              lotId: lot.id,
              transactionType: "PURCHASE",
              quantity: item.quantity,
              unitType: item.unitType,
              unit: item.unit,
              referenceType: "PURCHASE",
              referenceId: createdPurchase.id,
              notes: `Purchase ${purchaseNo}`,
            },
          });
        }

        return createdPurchase;
      },
      {
        maxWait: 30000,
        timeout: 30000,
      }
    );

    const completePurchase = await prisma.purchase.findUnique({
      where: {
        id: purchase.id,
      },
      include: {
        supplier: true,
        items: {
          include: {
            rawMaterial: true,
            lot: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: completePurchase,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create purchase:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create purchase",
      },
      { status: 500 }
    );
  }
}