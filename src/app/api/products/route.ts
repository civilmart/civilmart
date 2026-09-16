import { NextRequest, NextResponse } from "next/server";
import { ProductUnit } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import type { AdminProductListItem } from "@/types/api";
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
    const barcode = url.searchParams.get("barcode")?.trim();
    const labelsOnly = url.searchParams.get("labelsOnly") === "true";

    const where: Prisma.ProductWhereInput = {
      ...(category ? { category: { name: category } } : {}),
      ...(barcode
        ? {
            OR: [
              { barcode },
              { variants: { some: { barcode } } },
            ],
          }
        : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
              { barcode: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    if (labelsOnly) {
      const labels = await prisma.product.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          barcode: true,
          imageUrl: true,
        },
        orderBy: { name: "asc" },
      });

      return NextResponse.json(
        labels.map((label) => ({
          id: label.id,
          code: label.code,
          name: label.name,
          barcode: label.barcode,
          price: null,
          imageUrl: label.imageUrl,
        }))
      );
    }

    const products = await prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(products as unknown as AdminProductListItem[]);
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
      description,
      status,
      imageUrl,
      imageUrl2,
      categoryId,
      isFeatured,
      unit,
      subcategory,
      trades,
      stockQuantity,
      barcode,
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

    const productBarcode = barcode?.trim() || null;

    if (productBarcode) {
      const barcodeOwner = await prisma.product.findUnique({
        where: { barcode: productBarcode },
        select: { id: true },
      });

      if (barcodeOwner) {
        return NextResponse.json(
          { error: `Barcode already in use: ${productBarcode}` },
          { status: 409 }
        );
      }
    }

    const preparedVariants: Array<{
      sku: string;
      name: string;
      sizeValue: number;
      sizeUnit: ProductUnit;
      imageUrl: string | null;
      status: "ACTIVE";
      barcode: string | null;
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

        const variantBarcode = variant.barcode?.trim() || null;

        if (variantBarcode) {
          const barcodeOwner = await prisma.productVariant.findUnique({
            where: { barcode: variantBarcode },
            select: { id: true },
          });

          if (barcodeOwner) {
            return NextResponse.json(
              { error: `Barcode already in use: ${variantBarcode}` },
              { status: 409 }
            );
          }
        }

        preparedVariants.push({
          sku: variant.sku.trim(),
          name: variant.name.trim(),
          sizeValue,
          sizeUnit: (variant.sizeUnit || unit) as ProductUnit,
          imageUrl: variant.imageUrl?.trim() || null,
          status: "ACTIVE",
          barcode: variantBarcode,
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
        description: description?.trim() || null,
        status: status || "ACTIVE",
        imageUrl: imageUrl?.trim() || null,
        imageUrl2: imageUrl2?.trim() || null,
        categoryId: categoryId || null,
        isFeatured: Boolean(isFeatured),
        unit,
        subcategory: subcategory?.trim() || null,
        trades: Array.isArray(trades)
          ? trades.map((t) => String(t).trim()).filter(Boolean)
          : [],
        stockQuantity: toNumberOrZero(stockQuantity),
        barcode: productBarcode,
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