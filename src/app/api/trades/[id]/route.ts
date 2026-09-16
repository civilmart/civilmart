import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { slugify } from "@/lib/catalog";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUserOrThrow();
    if (!isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (typeof body.name === "string" && body.name.trim()) {
      const trimmed = body.name.trim();
      const clash = await prisma.trade.findFirst({
        where: { name: trimmed, id: { not: id } },
      });
      if (clash) {
        return NextResponse.json(
          { success: false, error: "Trade name already exists" },
          { status: 409 }
        );
      }
      data.name = trimmed;
      data.slug = slugify(trimmed);
    }

    if (typeof body.isActive === "boolean") {
      data.isActive = body.isActive;
    }

    if (typeof body.sortOrder === "number") {
      data.sortOrder = body.sortOrder;
    }

    const trade = await prisma.trade.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: trade });
  } catch (error) {
    console.error("Failed to update trade:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update trade" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUserOrThrow();
    if (!isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const categoryCount = await prisma.category.count({
      where: { tradeId: id },
    });

    if (categoryCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete trade with ${categoryCount} categor${
            categoryCount === 1 ? "y" : "ies"
          }. Move or delete its categories first.`,
        },
        { status: 409 }
      );
    }

    const trade = await prisma.trade.delete({ where: { id } });
    return NextResponse.json({ success: true, data: trade });
  } catch (error) {
    console.error("Failed to delete trade:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete trade" },
      { status: 500 }
    );
  }
}
