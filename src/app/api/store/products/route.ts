import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("search")?.trim().toLowerCase();
    const category = searchParams.get("category")?.trim();
    const featuredOnly = searchParams.get("featured") === "true";
    const limit = Math.min(
      Number(searchParams.get("limit") ?? 100),
      100
    );

    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        ...(category ? { category } : {}),
        ...(featuredOnly ? { isFeatured: true } : {}),
        ...(query
          ? { OR: [{ name: { contains: query, mode: "insensitive" } }] }
          : {}),
      },
      include: {
        variants: {
          where: { status: "ACTIVE" },
          orderBy: { sizeValue: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const data = products.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      imageUrl: p.imageUrl,
      imageUrl2: p.imageUrl2,
      category: p.category,
      isFeatured: p.isFeatured,
      price: p.price !== null ? Number(p.price) : null,
      variants: p.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        sizeValue: Number(v.sizeValue),
        sizeUnit: v.sizeUnit,
        price: v.price !== null ? Number(v.price) : null,
        imageUrl: v.imageUrl,
        stockQuantity: v.stockQuantity,
      })),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Store products error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}