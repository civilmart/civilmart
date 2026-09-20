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
      brand: null,
      description: product.description,
      status: product.status,
      imageUrl: product.imageUrl,
      imageUrl2: product.imageUrl2,
      price: null,
      isFeatured: product.isFeatured,
      unit: product.unit,
      subcategory: product.subcategory,
      minimumStock: null,
      maximumStock: null,
      reorderLevel: null,
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
        sizeValue: String(v.sizeValue ?? "1"),
        sizeUnit: v.sizeUnit,
        price: null,
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
      const trimmed = barcode != null ? String(barcode).trim() : "";

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
        const incomingIds = new Set<string>();
        const seenSkus = new Set<string>();

        const prepared: Array<{
          sku: string;
          name: string;
          sizeValue: string;
          sizeUnit: string;
          imageUrl: string | null;
          barcode: string | null;
          existingId: string | null;
        }> = [];

        for (const v of variants) {
          const sku = String(v.sku ?? "").trim();
          const name = String(v.name ?? "").trim();
          const sizeValue = String(v.sizeValue ?? "1").trim() || "1";

          if (!sku || !name) {
            throw new Error("Every variant requires an SKU and name");
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
            const barcodeOwner = await tx.productVariant.findFirst({
              where: { barcode: variantBarcode, id: { not: v.id ?? "" } },
              select: { id: true },
            });

            if (barcodeOwner) {
              throw new Error(`Barcode already in use: ${variantBarcode}`);
            }
          }

          const existingId = v.id && existingVariantIds.has(v.id) ? v.id : null;
          if (existingId) incomingIds.add(existingId);

          prepared.push({
            sku,
            name,
            sizeValue,
            sizeUnit: v.sizeUnit || data.unit || "PIECE",
            imageUrl: v.imageUrl?.trim() || null,
            barcode: variantBarcode,
            existingId,
          });
        }

        const idsToDelete = Array.from(existingVariantIds).filter(
          (vid) => !incomingIds.has(vid)
        );

        if (idsToDelete.length > 0) {
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

        for (const p of prepared) {
          if (p.existingId) {
            await tx.productVariant.update({
              where: { id: p.existingId },
              data: {
                sku: p.sku,
                name: p.name,
                sizeValue: p.sizeValue,
                sizeUnit: p.sizeUnit as ProductUnit,
                imageUrl: p.imageUrl,
                barcode: p.barcode,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                sku: p.sku,
                name: p.name,
                sizeValue: p.sizeValue,
                sizeUnit: p.sizeUnit as ProductUnit,
                imageUrl: p.imageUrl,
                barcode: p.barcode,
                productId: id,
              },
            });
          }
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: productInclude,
      });
    }, { timeout: 30000 });

    return NextResponse.json({
      id: updatedProduct.id,
      code: updatedProduct.code,
      barcode: updatedProduct.barcode,
      name: updatedProduct.name,
      brand: null,
      description: updatedProduct.description,
      status: updatedProduct.status,
      imageUrl: updatedProduct.imageUrl,
      imageUrl2: updatedProduct.imageUrl2,
      price: null,
      isFeatured: updatedProduct.isFeatured,
      unit: updatedProduct.unit,
      subcategory: updatedProduct.subcategory,
      minimumStock: null,
      maximumStock: null,
      reorderLevel: null,
      trades: updatedProduct.trades,
      stockQuantity: Number(updatedProduct.stockQuantity),
      categoryId: updatedProduct.categoryId,
      category: updatedProduct.category,
      variants: updatedProduct.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        barcode: v.barcode,
        name: v.name,
        sizeValue: String(v.sizeValue ?? "1"),
        sizeUnit: v.sizeUnit,
        price: null,
        imageUrl: v.imageUrl,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update product";

    console.error("PATCH product error:", message, error);

    if (/SKU|variant|Invalid|required|Duplicate|ledger|barcode/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: message },
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

    const invoiceCount = await prisma.invoiceItem.count({
      where: { productId: id },
    });
    const purchaseCount = await prisma.purchaseItem.count({
      where: { productId: id },
    });
    const purchaseOrderCount = await prisma.purchaseOrderItem.count({
      where: { productId: id },
    });
    const orderCount = await prisma.customerOrderItem.count({
      where: { productId: id },
    });
    const inventoryCount = await prisma.inventoryTransaction.count({
      where: { productId: id },
    });

    if (invoiceCount > 0) {
      return NextResponse.json({ error: `Cannot delete: ${invoiceCount} invoice(s) reference this product` }, { status: 409 });
    }
    if (purchaseCount > 0) {
      return NextResponse.json({ error: `Cannot delete: ${purchaseCount} purchase(s) reference this product` }, { status: 409 });
    }
    if (purchaseOrderCount > 0) {
      return NextResponse.json({ error: `Cannot delete: ${purchaseOrderCount} purchase order(s) reference this product` }, { status: 409 });
    }
    if (orderCount > 0) {
      return NextResponse.json({ error: `Cannot delete: ${orderCount} customer order(s) reference this product` }, { status: 409 });
    }
    if (inventoryCount > 0) {
      return NextResponse.json({ error: `Cannot delete: ${inventoryCount} inventory transaction(s) reference this product` }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.supplierProduct.deleteMany({ where: { productId: id } });
      await tx.customerWishlistItem.deleteMany({ where: { productId: id } });
      await tx.productVariant.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
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