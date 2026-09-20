import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const product = await prisma.product.findFirst({
      where: { id, status: "ACTIVE" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: { orderBy: { sizeValue: "asc" } },
        supplierProducts: { select: { retailPrice: true } },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const retailPrices = product.supplierProducts
      .map((sp) => (sp.retailPrice != null ? Number(sp.retailPrice) : null))
      .filter((r): r is number => r !== null);
    const retailPrice = retailPrices.length > 0 ? Math.min(...retailPrices) : null;

    if (retailPrice == null) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const data = {
      id: product.id,
      code: product.code,
      name: product.name,
      brand: null,
      description: product.description,
      unit: product.unit,
      stockQuantity: Number(product.stockQuantity),
      imageUrl: product.imageUrl,
      imageUrl2: product.imageUrl2,
      category: product.category?.name ?? null,
      categorySlug: product.category?.slug ?? null,
      subcategory: product.subcategory,
      trades: product.trades,
      isFeatured: product.isFeatured,
      retailPrice,
      variants: product.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        sizeValue: String(v.sizeValue ?? "1"),
        sizeUnit: v.sizeUnit,
        price: null,
        imageUrl: v.imageUrl || product.imageUrl,
      })),
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Store product detail error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}