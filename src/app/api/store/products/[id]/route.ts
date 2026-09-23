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
        supplierProducts: {
          select: {
            retailPrice: true,
            variantPrices: {
              select: {
                productVariantId: true,
                retailPrice: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const allPrices: number[] = [];
    const variantPriceMap = new Map<string, number>();

    for (const sp of product.supplierProducts) {
      if (sp.retailPrice != null) {
        allPrices.push(Number(sp.retailPrice));
      }
      for (const vp of sp.variantPrices) {
        if (vp.retailPrice == null) continue;
        const price = Number(vp.retailPrice);
        allPrices.push(price);
        const current = variantPriceMap.get(vp.productVariantId);
        if (current == null || price < current) {
          variantPriceMap.set(vp.productVariantId, price);
        }
      }
    }

    const retailPrice = allPrices.length > 0 ? Math.min(...allPrices) : null;

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
        retailPrice: variantPriceMap.get(v.id) ?? null,
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