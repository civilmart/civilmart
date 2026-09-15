import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import { slugify } from "@/lib/catalog";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await getSessionUserOrThrow();
    const { id } = await context.params;
    const body = await request.json();

    const category = await prisma.category.findUnique({ where: { id } });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();

      if (!name) {
        return NextResponse.json(
          { error: "Category name is required" },
          { status: 400 }
        );
      }

      const other = await prisma.category.findUnique({ where: { name } });

      if (other && other.id !== id) {
        return NextResponse.json(
          { error: "Category name already exists" },
          { status: 409 }
        );
      }

      data.name = name;
      data.slug = slugify(name);
    }

    if (body.group !== undefined) {
      data.group =
        body.group === null ? null : String(body.group).trim() || null;
    }

    if (body.tradeId !== undefined) {
      if (body.tradeId === null) {
        data.tradeId = null;
      } else {
        const trade = await prisma.trade.findUnique({
          where: { id: String(body.tradeId) },
        });
        if (!trade) {
          return NextResponse.json({ error: "Trade not found" }, { status: 400 });
        }
        data.tradeId = trade.id;
      }
    }

    if (body.description !== undefined) {
      data.description =
        body.description === null
          ? null
          : String(body.description).trim() || null;
    }

    if (body.imageUrl !== undefined) {
      data.imageUrl =
        body.imageUrl === null
          ? null
          : String(body.imageUrl).trim() || null;
    }

    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

    if (Object.keys(data).length > 0) {
      data.updatedAt = new Date();
    }

    const updated = await prisma.category.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH category error:", error);

    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await getSessionUserOrThrow();
    const { id } = await context.params;

    const productCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${productCount} product(s) are linked to this category`,
        },
        { status: 409 }
      );
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE category error:", error);

    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}