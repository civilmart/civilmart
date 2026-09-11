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
        variants: {
          where: { status: "ACTIVE" },
          orderBy: { sizeValue: "asc" },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const data = {
      id: product.id,
      code: product.code,
      name: product.name,
      description: product.description,
      imageUrl: product.imageUrl,
      imageUrl2: product.imageUrl2,
      category: product.category,
      isFeatured: product.isFeatured,
      price: product.price !== null ? Number(product.price) : null,
      variants: product.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        sizeValue: Number(v.sizeValue),
        sizeUnit: v.sizeUnit,
        price: v.price !== null ? Number(v.price) : null,
        imageUrl: v.imageUrl,
        stockQuantity: v.stockQuantity,
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