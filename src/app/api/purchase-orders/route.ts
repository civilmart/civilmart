import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import { isValidUnit } from "@/lib/catalog";

type PreparedItem = {
  productId: string;
  variantId: string | null;
  quantity: number;
  unit: string;
  estimatedCostPerUnit: number | null;
  notes: string | null;
};

export async function GET() {
  try {
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
      orderBy: { orderDate: "desc" },
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

export async function POST(request: NextRequest) {
  try {
    await getSessionUserOrThrow();
    const body = await request.json();

    const { poNumber, supplierId, orderDate, expectedDate, items, notes } =
      body;

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
      if (!item.productId) {
        return NextResponse.json(
          { error: "Each item requires a product" },
          { status: 400 }
        );
      }

      if (!item.unit || !isValidUnit(String(item.unit))) {
        return NextResponse.json(
          { error: `Invalid unit: ${item.unit}` },
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

      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      let variantIdResolved = item.variantId || null;

      if (variantIdResolved) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: variantIdResolved },
        });

        if (!variant || variant.productId !== product.id) {
          return NextResponse.json(
            { error: "Variant does not belong to the product" },
            { status: 400 }
          );
        }
      }

      let estimatedCostPerUnit: number | null = null;

      if (
        item.estimatedCostPerUnit !== undefined &&
        item.estimatedCostPerUnit !== null &&
        item.estimatedCostPerUnit !== ""
      ) {
        estimatedCostPerUnit = Number(item.estimatedCostPerUnit);

        if (!Number.isFinite(estimatedCostPerUnit) || estimatedCostPerUnit < 0) {
          return NextResponse.json(
            { error: `Invalid estimated cost for ${product.name}` },
            { status: 400 }
          );
        }
      }

      preparedItems.push({
        productId: item.productId,
        variantId: variantIdResolved,
        quantity,
        unit: String(item.unit),
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
            product: true,
            variant: true,
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