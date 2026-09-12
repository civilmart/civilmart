import { NextRequest, NextResponse } from "next/server";
import { ProductUnit } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import {
  isValidUnit,
  VALID_PRODUCT_STATUSES,
  toNumberOrNull,
  toNumberOrZero,
} from "@/lib/catalog";

const productInclude = {
  category: { select: { id: true, name: true, slug: true, group: true } },
  variants: { orderBy: { sizeValue: "asc" } },
} as const;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get("category");
    const q = url.searchParams.get("q");

    const products = await prisma.product.findMany({
      where: {
        ...(category ? { category: { name: category } } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { code: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: productInclude,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("GET products error:", error);

    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await getSessionUserOrThrow();
    const body = await request.json();

    const {
      code,
      name,
      brand,
      description,
      status,
      imageUrl,
      imageUrl2,
      price,
      categoryId,
      isFeatured,
      unit,
      subcategory,
      minimumStock,
      maximumStock,
      reorderLevel,
      trades,
      stockQuantity,
      variants,
    } = body;

    if (!code?.trim()) {
      return NextResponse.json(
        { error: "Product code is required" },
        { status: 400 }
      );
    }

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

    if (!unit || !isValidUnit(String(unit))) {
      return NextResponse.json(
        { error: "A valid selling unit is required" },
        { status: 400 }
      );
    }

    const productPrice = toNumberOrNull(price);

    if (productPrice !== null && productPrice < 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    if (status !== undefined && !VALID_PRODUCT_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 400 }
        );
      }
    }

    const existingProduct = await prisma.product.findUnique({
      where: { code: code.trim() },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: "Product code already exists" },
        { status: 409 }
      );
    }

    const preparedVariants: Array<{
      sku: string;
      name: string;
      sizeValue: number;
      sizeUnit: ProductUnit;
      price: string | null;
      imageUrl: string | null;
      status: "ACTIVE";
    }> = [];

    if (Array.isArray(variants)) {
      for (const variant of variants) {
        if (!variant.sku?.trim() || !variant.name?.trim()) {
          return NextResponse.json(
            { error: "Each variant requires an SKU and name" },
            { status: 400 }
          );
        }

        const sizeValue = Number(variant.sizeValue);

        if (!Number.isFinite(sizeValue) || sizeValue <= 0) {
          return NextResponse.json(
            { error: `Invalid size for variant ${variant.name}` },
            { status: 400 }
          );
        }

        if (variant.sizeUnit && !isValidUnit(String(variant.sizeUnit))) {
          return NextResponse.json(
            { error: `Invalid unit for variant ${variant.name}` },
            { status: 400 }
          );
        }

        const variantPrice = toNumberOrNull(variant.price);

        if (variantPrice !== null && variantPrice < 0) {
          return NextResponse.json(
            { error: `Invalid price for variant ${variant.name}` },
            { status: 400 }
          );
        }

        preparedVariants.push({
          sku: variant.sku.trim(),
          name: variant.name.trim(),
          sizeValue,
          sizeUnit: (variant.sizeUnit || unit) as ProductUnit,
          price: variantPrice !== null ? String(variantPrice) : null,
          imageUrl: variant.imageUrl?.trim() || null,
          status: "ACTIVE",
        });
      }
    }

    if (preparedVariants.length > 0) {
      const skus = preparedVariants.map((v) => v.sku);
      const existingVariants = await prisma.productVariant.findMany({
        where: { sku: { in: skus } },
        select: { sku: true },
      });

      if (existingVariants.length > 0) {
        return NextResponse.json(
          { error: `SKU already exists: ${existingVariants[0].sku}` },
          { status: 409 }
        );
      }
    }

    const product = await prisma.product.create({
      data: {
        code: code.trim(),
        name: name.trim(),
        brand: brand?.trim() || null,
        description: description?.trim() || null,
        status: status || "ACTIVE",
        imageUrl: imageUrl?.trim() || null,
        imageUrl2: imageUrl2?.trim() || null,
        price: productPrice !== null ? String(productPrice) : null,
        categoryId: categoryId || null,
        isFeatured: Boolean(isFeatured),
        unit,
        subcategory: subcategory?.trim() || null,
        minimumStock:
          toNumberOrNull(minimumStock)?.toString() ?? null,
        maximumStock: toNumberOrNull(maximumStock)?.toString() ?? null,
        reorderLevel: toNumberOrNull(reorderLevel)?.toString() ?? null,
        trades: Array.isArray(trades)
          ? trades.map((t) => String(t).trim()).filter(Boolean)
          : [],
        stockQuantity: toNumberOrZero(stockQuantity),
        variants: preparedVariants.length
          ? { createMany: { data: preparedVariants } }
          : undefined,
      },
      include: productInclude,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("POST product error:", error);

    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}