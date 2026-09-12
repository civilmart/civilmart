import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeOrder } from "@/lib/store-order";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const VALID_STATUSES = new Set([
  "PLACED",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const order = await prisma.customerOrder.findUnique({
      where: { id },
      include: {
        items: true,
        statusEvents: { orderBy: { at: "asc" } },
        customer: { select: { id: true, username: true, email: true, phone: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: serializeOrder(order) });
  } catch (error) {
    console.error("Order fetch failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { status, note } = body;

    if (!VALID_STATUSES.has(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    const existing = await prisma.customerOrder.findUnique({
      where: { id },
      include: { items: true, statusEvents: { orderBy: { at: "asc" } } },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    if (existing.status === status) {
      return NextResponse.json(
        { success: false, error: "Order is already in this status" },
        { status: 400 }
      );
    }

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.customerOrder.update({
        where: { id },
        data: {
          status,
          statusEvents: {
            create: [{ status, note: note?.trim() || null }],
          },
        },
        include: {
          items: true,
          statusEvents: { orderBy: { at: "asc" } },
        },
      });

      // Restore stock for cancelled orders (stock is decremented at placement).
      if (status === "CANCELLED" && existing.status !== "CANCELLED") {
        for (const item of existing.items) {
          const productId = item.productId!;

          const product = await tx.product.findUnique({
            where: { id: productId },
            select: { stockQuantity: true },
          });

          await tx.product.update({
            where: { id: productId },
            data: {
              stockQuantity: String(
                Number(product?.stockQuantity ?? 0) + Number(item.quantity)
              ),
            },
          });

          await tx.inventoryTransaction.create({
            data: {
              productId,
              variantId: item.variantId ?? undefined,
              transactionType: "SALE_RETURN",
              quantity: item.quantity,
              unit: item.unit,
              referenceType: "CUSTOMER_ORDER",
              referenceId: existing.id,
              notes: "Stock restored — order cancelled",
            },
          });
        }
      }

      return updated;
    });

    return NextResponse.json({ success: true, data: serializeOrder(order) });
  } catch (error) {
    console.error("Order status update failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to update order" },
      { status: 500 }
    );
  }
}