import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerUser } from "@/lib/customer";
import { serializeOrder } from "@/lib/store-order";

type RouteContext = {
  params: Promise<{ orderNumber: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { orderNumber } = await context.params;
    const orderNumberUpper = orderNumber.toUpperCase();

    const order = await prisma.customerOrder.findUnique({
      where: { orderNumber: orderNumberUpper },
      include: { items: true, statusEvents: { orderBy: { at: "asc" } } },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const customer = await getCustomerUser();

    // An authenticated owner, or a phone-number match, may view the order.
    const { searchParams } = new URL(request.url);
    const contact = searchParams.get("phone")?.trim();

    if (customer?.id === order.customerId || contact === order.phone) {
      return NextResponse.json({
        success: true,
        data: serializeOrder(order),
      });
    }

    return NextResponse.json(
      { success: false, error: "Order not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Order tracking failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}