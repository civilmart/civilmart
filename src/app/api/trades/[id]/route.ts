import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import { slugify } from "@/lib/catalog";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await getSessionUserOrThrow();
    const { id } = await context.params;
    const body = await request.json();

    const trade = await prisma.trade.findUnique({ where: { id } });
    if (!trade) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ error: "Trade name is required" }, { status: 400 });
      }
      const other = await prisma.trade.findUnique({ where: { name } });
      if (other && other.id !== id) {
        return NextResponse.json({ error: "Trade name already exists" }, { status: 409 });
      }
      data.name = name;
      data.slug = slugify(name);
    }

    if (body.description !== undefined) {
      data.description = body.description === null ? null : String(body.description).trim() || null;
    }

    if (body.sortOrder !== undefined) {
      data.sortOrder = Number(body.sortOrder);
    }

    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

    data.updatedAt = new Date();

    const updated = await prisma.trade.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH trade error:", error);
    return NextResponse.json({ error: "Failed to update trade" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await getSessionUserOrThrow();
    const { id } = await context.params;

    const categoryCount = await prisma.category.count({ where: { tradeId: id } });
    if (categoryCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${categoryCount} category(ies) are linked to this trade` },
        { status: 409 }
      );
    }

    await prisma.trade.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE trade error:", error);
    return NextResponse.json({ error: "Failed to delete trade" }, { status: 500 });
  }
}
