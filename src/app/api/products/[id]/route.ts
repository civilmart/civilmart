import { NextRequest, NextResponse } from "next/server";
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
  supplierProducts: {
    include: {
      supplier: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
    },
  },
} as const;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: product.id,
      code: product.code,
      barcode: product.barcode,
      name: product.name,
      brand: product.brand,
      description: product.description,
      status: product.status,
      imageUrl: product.imageUrl,
      imageUrl2: product.imageUrl2,
      price: product.price !== null ? Number(product.price) : null,
      isFeatured: product.isFeatured,
      unit: product.unit,
      subcategory: product.subcategory,
      minimumStock:
        product.minimumStock !== null ? Number(product.minimumStock) : null,
      maximumStock:
        product.maximumStock !== null ? Number(product.maximumStock) : null,
      reorderLevel:
        product.reorderLevel !== null ? Number(product.reorderLevel) : null,
      trades: product.trades,
      stockQuantity: Number(product.stockQuantity),
      categoryId: product.categoryId,
      category: product.category,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      variants: product.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        barcode: v.barcode,
        name: v.name,
        sizeValue: Number(v.sizeValue),
        sizeUnit: v.sizeUnit,
        price: v.price !== null ? Number(v.price) : null,
        imageUrl: v.imageUrl,
      })),
      supplierProducts: product.supplierProducts.map((sp) => ({
        id: sp.id,
        rateListPrice: sp.rateListPrice !== null ? Number(sp.rateListPrice) : null,
        discount: Number(sp.discount),
        retailPrice: sp.retailPrice !== null ? Number(sp.retailPrice) : null,
        notes: sp.notes,
        supplier: sp.supplier,
        brand: sp.brand,
      })),
    });
  } catch (error) {
    console.error("GET product error:", error);

    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await getSessionUserOrThrow();
    const { id } = await context.params;
    const body = await request.json();

    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};

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
      barcode,
      variants,
    } = body;

    if (code !== undefined) {
      if (!String(code).trim()) {
        return NextResponse.json(
          { error: "Product code is required" },
          { status: 400 }
        );
      }

      const other = await prisma.product.findUnique({
        where: { code: String(code).trim() },
      });

      if (other && other.id !== id) {
        return NextResponse.json(
          { error: "Product code already exists" },
          { status: 409 }
        );
      }

      data.code = String(code).trim();
    }

    if (barcode !== undefined) {
      const trimmed = String(barcode).trim();

      if (trimmed) {
        const owner = await prisma.product.findUnique({
          where: { barcode: trimmed },
          select: { id: true },
        });

        if (owner && owner.id !== id) {
          return NextResponse.json(
            { error: `Barcode already in use: ${trimmed}` },
            { status: 409 }
          );
        }

        data.barcode = trimmed;
      } else {
        data.barcode = null;
      }
    }

    if (name !== undefined) {
      if (!String(name).trim()) {
        return NextResponse.json(
          { error: "Product name is required" },
          { status: 400 }
        );
      }

      data.name = String(name).trim();
    }

    if (brand !== undefined) {
      data.brand = String(brand).trim() || null;
    }

    if (description !== undefined) {
      data.description = String(description).trim() || null;
    }

    if (imageUrl !== undefined) data.imageUrl = String(imageUrl).trim() || null;
    if (imageUrl2 !== undefined)
      data.imageUrl2 = String(imageUrl2).trim() || null;

    if (categoryId !== undefined) {
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

      data.categoryId = categoryId || null;
    }

    if (unit !== undefined) {
      if (!isValidUnit(String(unit))) {
        return NextResponse.json(
          { error: "Invalid selling unit" },
          { status: 400 }
        );
      }

      data.unit = String(unit);
    }

    if (subcategory !== undefined) {
      data.subcategory = String(subcategory).trim() || null;
    }

    if (minimumStock !== undefined)
      data.minimumStock = toNumberOrNull(minimumStock)?.toString() ?? null;
    if (maximumStock !== undefined)
      data.maximumStock = toNumberOrNull(maximumStock)?.toString() ?? null;
    if (reorderLevel !== undefined)
      data.reorderLevel = toNumberOrNull(reorderLevel)?.toString() ?? null;

    if (trades !== undefined) {
      data.trades = Array.isArray(trades)
        ? trades.map((t) => String(t).trim()).filter(Boolean)
        : [];
    }

    if (stockQuantity !== undefined) {
      const n = toNumberOrZero(stockQuantity);

      if (Number.isFinite(Number(n))) {
        const diff = n - Number(product.stockQuantity);

        if (diff !== 0) {
          data.stockQuantity = String(n);
        }
      }
    }

    if (price !== undefined) {
      const numeric = toNumberOrNull(price);

      if (numeric !== null && numeric < 0) {
        return NextResponse.json(
          { error: "Invalid price" },
          { status: 400 }
        );
      }

      data.price = numeric !== null ? String(numeric) : null;
    }

    if (isFeatured !== undefined) {
      data.isFeatured = Boolean(isFeatured);
    }

    if (status !== undefined) {
      if (!VALID_PRODUCT_STATUSES.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      data.status = status;
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.product.update({ where: { id }, data });
      }

      if (Array.isArray(variants)) {
        const saved = await tx.product.findUniqueOrThrow({
          where: { id },
          include: { variants: true },
        });

        const existingVariantIds = new Set(saved.variants.map((v) => v.id));
        const seenSkus = new Set<string>();

        for (const v of variants) {
          const sku = String(v.sku ?? "").trim();
          const name = String(v.name ?? "").trim();
          const sizeValue = Number(v.sizeValue);
          const variantPrice = toNumberOrNull(v.price);

          if (!sku || !name) {
            throw new Error("Every variant requires an SKU and name");
          }

          if (!Number.isFinite(sizeValue) || sizeValue <= 0) {
            throw new Error(`Invalid size for variant ${name}`);
          }

          if (variantPrice !== null && variantPrice < 0) {
            throw new Error(`Invalid price for variant ${name}`);
          }

          if (v.sizeUnit && !isValidUnit(String(v.sizeUnit))) {
            throw new Error(`Invalid unit for variant ${name}`);
          }

          if (seenSkus.has(sku)) {
            throw new Error(`Duplicate SKU within product: ${sku}`);
          }

          seenSkus.add(sku);

          const variantBarcode = v.barcode?.trim() || null;

          if (variantBarcode) {
            const barcodeOwner = await tx.productVariant.findUnique({
              where: { barcode: variantBarcode },
              select: { id: true },
            });

            if (barcodeOwner && barcodeOwner.id !== v.id) {
              throw new Error(`Barcode already in use: ${variantBarcode}`);
            }
          }

          const variantData = {
            sku,
            name,
            sizeValue,
            sizeUnit: v.sizeUnit || data.unit || "PIECE",
            price: variantPrice !== null ? String(variantPrice) : null,
            imageUrl: v.imageUrl?.trim() || null,
            barcode: variantBarcode,
          };

          if (v.id && existingVariantIds.has(v.id)) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: variantData,
            });
            existingVariantIds.delete(v.id);
          } else {
            await tx.productVariant.create({
              data: { ...variantData, productId: id },
            });
          }
        }

        if (existingVariantIds.size > 0) {
          const idsToDelete = Array.from(existingVariantIds);
          const linked = await tx.inventoryTransaction.count({
            where: { variantId: { in: idsToDelete } },
          });

          if (linked > 0) {
            throw new Error("A variant has ledger history and cannot be removed");
          }

          await tx.productVariant.deleteMany({
            where: { id: { in: idsToDelete } },
          });
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: productInclude,
      });
    });

    return NextResponse.json({
      id: updatedProduct.id,
      code: updatedProduct.code,
      barcode: updatedProduct.barcode,
      name: updatedProduct.name,
      brand: updatedProduct.brand,
      description: updatedProduct.description,
      status: updatedProduct.status,
      imageUrl: updatedProduct.imageUrl,
      imageUrl2: updatedProduct.imageUrl2,
      price:
        updatedProduct.price !== null ? Number(updatedProduct.price) : null,
      isFeatured: updatedProduct.isFeatured,
      unit: updatedProduct.unit,
      subcategory: updatedProduct.subcategory,
      minimumStock:
        updatedProduct.minimumStock !== null
          ? Number(updatedProduct.minimumStock)
          : null,
      maximumStock:
        updatedProduct.maximumStock !== null
          ? Number(updatedProduct.maximumStock)
          : null,
      reorderLevel:
        updatedProduct.reorderLevel !== null
          ? Number(updatedProduct.reorderLevel)
          : null,
      trades: updatedProduct.trades,
      stockQuantity: Number(updatedProduct.stockQuantity),
      categoryId: updatedProduct.categoryId,
      category: updatedProduct.category,
      variants: updatedProduct.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        barcode: v.barcode,
        name: v.name,
        sizeValue: Number(v.sizeValue),
        sizeUnit: v.sizeUnit,
        price: v.price !== null ? Number(v.price) : null,
        imageUrl: v.imageUrl,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update product";

    if (/SKU|variant|Invalid|required|Duplicate|ledger|barcode/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error("PATCH product error:", error);

    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await getSessionUserOrThrow();
    const { id } = await context.params;

    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    await prisma.product.update({
      where: { id },
      data: { status: "DISCONTINUED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE product error:", error);

    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}