import { Prisma, $Enums } from "@/generated/prisma/client";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeOrder } from "@/lib/store-order";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.trim();
    const query = searchParams.get("q")?.trim();

    const where: Prisma.CustomerOrderWhereInput = {
      ...(status
        ? { status: status as $Enums.CustomerOrderStatus }
        : {}),
      ...(query
        ? {
            OR: [
              { orderNumber: { contains: query, mode: "insensitive" as const } },
              { phone: { contains: query } },
              { customerName: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const orders = await prisma.customerOrder.findMany({
      where,
      include: {
        items: true,
        statusEvents: { orderBy: { at: "asc" } },
        customer: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({
      success: true,
      data: orders.map((order) => serializeOrder(order)),
    });
  } catch (error) {
    console.error("Admin orders list failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}