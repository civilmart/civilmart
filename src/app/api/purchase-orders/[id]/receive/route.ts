import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ReceiveItem = {
  itemId: string;
  receivedQuantity: number;
  costPerUnit?: number | null;
  lotNumber?: string | null;
  expiryDate?: string | null;
};

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const receivedItems = body.items as ReceiveItem[];

    if (!Array.isArray(receivedItems) || receivedItems.length === 0) {
      return NextResponse.json(
        { error: "At least one item must be received" },
        { status: 400 }
      );
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            rawMaterial: true,
          },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    if (
      purchaseOrder.status === "CANCELLED" ||
      purchaseOrder.status === "RECEIVED"
    ) {
      return NextResponse.json(
        {
          error: `Purchase order is already ${purchaseOrder.status.toLowerCase()}`,
        },
        { status: 400 }
      );
    }

    type PreparedReceiveItem = {
      poItem: (typeof purchaseOrder.items)[number];
      receivedQuantity: number;
      costPerUnit: number;
      lotNumber: string;
      expiryDate: Date | null;
    };

    const preparedItems: PreparedReceiveItem[] = [];

    for (const receivedItem of receivedItems) {
      const poItem = purchaseOrder.items.find(
        (item) => item.id === receivedItem.itemId
      );

      if (!poItem) {
        return NextResponse.json(
          { error: "Purchase order item not found" },
          { status: 404 }
        );
      }

      const receivedQuantity = Number(
        receivedItem.receivedQuantity
      );

      if (
        !Number.isFinite(receivedQuantity) ||
        receivedQuantity <= 0
      ) {
        return NextResponse.json(
          {
            error: `Invalid received quantity for ${poItem.rawMaterial.name}`,
          },
          { status: 400 }
        );
      }

      const orderedQuantity = Number(poItem.quantity);
      const alreadyReceived = Number(poItem.receivedQuantity);

      const remainingQuantity =
        orderedQuantity - alreadyReceived;

      if (receivedQuantity > remainingQuantity) {
        return NextResponse.json(
          {
            error: `Cannot receive ${receivedQuantity} ${poItem.unit}. Only ${remainingQuantity} ${poItem.unit} remains for ${poItem.rawMaterial.name}`,
          },
          { status: 400 }
        );
      }

      const costPerUnit = Number(
        receivedItem.costPerUnit ??
          poItem.estimatedCostPerUnit ??
          0
      );

      if (
        !Number.isFinite(costPerUnit) ||
        costPerUnit < 0
      ) {
        return NextResponse.json(
          {
            error: `Invalid cost per unit for ${poItem.rawMaterial.name}`,
          },
          { status: 400 }
        );
      }

      const lotNumber =
        receivedItem.lotNumber?.trim() ||
        `${purchaseOrder.poNumber}-${poItem.rawMaterialId.slice(-6)}-${Date.now()}`;

      const expiryDate = receivedItem.expiryDate
        ? new Date(receivedItem.expiryDate)
        : null;

      if (
        expiryDate &&
        Number.isNaN(expiryDate.getTime())
      ) {
        return NextResponse.json(
          {
            error: `Invalid expiry date for ${poItem.rawMaterial.name}`,
          },
          { status: 400 }
        );
      }

      preparedItems.push({
        poItem,
        receivedQuantity,
        costPerUnit,
        lotNumber,
        expiryDate,
      });
    }

    const purchaseNo = `PUR-${purchaseOrder.poNumber}-${Date.now()}`;

    const subtotal = preparedItems.reduce(
      (sum, item) =>
        sum +
        item.receivedQuantity *
          item.costPerUnit,
      0
    );

    const purchase = await prisma.$transaction(
      async (tx) => {
        const createdPurchase =
          await tx.purchase.create({
            data: {
              purchaseNo,
              supplierId:
                purchaseOrder.supplierId,
              purchaseDate: new Date(),
              status: "RECEIVED",
              subtotal,
              tax: 0,
              discount: 0,
              totalAmount: subtotal,
              notes: `Received against Purchase Order ${purchaseOrder.poNumber}`,
            },
          });

        for (const item of preparedItems) {
          const lot =
            await tx.rawMaterialLot.create({
              data: {
                rawMaterialId:
                  item.poItem.rawMaterialId,
                supplierId:
                  purchaseOrder.supplierId,
                lotNumber: item.lotNumber,
                receivedAt: new Date(),
                expiryDate: item.expiryDate,
                receivedQty:
                  item.receivedQuantity,
                unitType:
                  item.poItem.unitType,
                unit: item.poItem.unit,
                costPerUnit:
                  item.costPerUnit,
                totalCost:
                  item.receivedQuantity *
                  item.costPerUnit,
                notes: `Received from PO ${purchaseOrder.poNumber}`,
              },
            });

          await tx.purchaseItem.create({
            data: {
              purchaseId:
                createdPurchase.id,
              rawMaterialId:
                item.poItem.rawMaterialId,
              lotId: lot.id,
              quantity:
                item.receivedQuantity,
              unitType:
                item.poItem.unitType,
              unit: item.poItem.unit,
              costPerUnit:
                item.costPerUnit,
              totalCost:
                item.receivedQuantity *
                item.costPerUnit,
              notes: `Received from PO ${purchaseOrder.poNumber}`,
            },
          });

          await tx.inventoryTransaction.create({
            data: {
              rawMaterialId:
                item.poItem.rawMaterialId,
              lotId: lot.id,
              transactionType:
                "PURCHASE",
              quantity:
                item.receivedQuantity,
              unitType:
                item.poItem.unitType,
              unit: item.poItem.unit,
              referenceType:
                "PURCHASE",
              referenceId:
                createdPurchase.id,
              notes: `Received against PO ${purchaseOrder.poNumber}`,
            },
          });

          await tx.purchaseOrderItem.update({
            where: {
              id: item.poItem.id,
            },
            data: {
              receivedQuantity: {
                increment:
                  item.receivedQuantity,
              },
            },
          });
        }

        const updatedItems =
          await tx.purchaseOrderItem.findMany({
            where: {
              purchaseOrderId:
                purchaseOrder.id,
            },
          });

        const fullyReceived =
          updatedItems.every(
            (item) =>
              Number(
                item.receivedQuantity
              ) >=
              Number(item.quantity)
          );

        await tx.purchaseOrder.update({
          where: {
            id: purchaseOrder.id,
          },
          data: {
            status: fullyReceived
              ? "RECEIVED"
              : "PARTIALLY_RECEIVED",
          },
        });

        return createdPurchase;
      },
      {
        maxWait: 30000,
        timeout: 30000,
      }
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Purchase order received successfully",
        purchaseId: purchase.id,
        purchaseNo: purchase.purchaseNo,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST purchase order receive error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to receive purchase order",
      },
      { status: 500 }
    );
  }
}