import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";

const BULK_STATUSES = ["ACTIVE", "INACTIVE", "DISCONTINUED"];

export async function PATCH(request: NextRequest) {
  try {
    await getSessionUserOrThrow();

    const body = await request.json();
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
    const status = String(body.status ?? "").toUpperCase();

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "No products selected" },
        { status: 400 }
      );
    }

    if (!BULK_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Use ACTIVE or INACTIVE." },
        { status: 400 }
      );
    }

    const result = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { status: status as "ACTIVE" | "INACTIVE" | "DISCONTINUED" },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      status,
    });
  } catch (error) {
    console.error("Bulk product status error:", error);

    return NextResponse.json(
      { error: "Failed to update products" },
      { status: 500 }
    );
  }
}