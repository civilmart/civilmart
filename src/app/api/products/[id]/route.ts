import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: { orderBy: { sizeValue: "asc" } },
      },
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
      name: product.name,
      description: product.description,
      status: product.status,
      imageUrl: product.imageUrl,
      imageUrl2: product.imageUrl2,
      price: product.price !== null ? Number(product.price) : null,
      isFeatured: product.isFeatured,
      category: product.category,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      variants: product.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        sizeValue: Number(v.sizeValue),
        sizeUnit: v.sizeUnit,
        price: v.price !== null ? Number(v.price) : null,
        imageUrl: v.imageUrl,
        stockQuantity: v.stockQuantity,
        status: v.status,
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

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
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
      price,
      category,
      isFeatured,
      variants,
    } = body;

    if (code !== undefined) {
      if (!code.trim()) {
        return NextResponse.json(
          { error: "Product code is required" },
          { status: 400 }
        );
      }

      const other = await prisma.product.findUnique({
        where: { code: code.trim() },
      });

      if (other && other.id !== id) {
        return NextResponse.json(
          { error: "Product code already exists" },
          { status: 409 }
        );
      }

      data.code = code.trim();
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: "Product name is required" },
          { status: 400 }
        );
      }

      data.name = name.trim();
    }

    if (description !== undefined) {
      data.description = description?.trim() || null;
    }

    if (imageUrl !== undefined) data.imageUrl = imageUrl?.trim() || null;
    if (imageUrl2 !== undefined) data.imageUrl2 = imageUrl2?.trim() || null;

    if (category !== undefined) {
      data.category = category?.trim() || null;
    }

    if (price !== undefined) {
      const numeric = price === null || price === "" ? null : Number(price);
      if (numeric !== null && Number.isNaN(numeric)) {
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
      const valid = ["ACTIVE", "INACTIVE", "DISCONTINUED"];
      if (!valid.includes(status)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        );
      }
      data.status = status;
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const saved = await tx.product.update({
        where: { id },
        data,
        include: {
          variants: {
            orderBy: { sizeValue: "asc" },
          },
        },
      });

      if (Array.isArray(variants)) {
        const existingVariantIds = new Set(
          saved.variants.map((v) => v.id)
        );

        for (const v of variants) {
          const sizeValue = Number(v.sizeValue);
          const variantPrice =
            v.price === undefined || v.price === null || v.price === ""
              ? null
              : Number(v.price);

          if (
            !String(v.sku ?? "").trim() ||
            !String(v.name ?? "").trim()
          ) {
            throw new Error("Every variant requires an SKU and name");
          }

          if (!Number.isFinite(sizeValue) || sizeValue <= 0) {
            throw new Error(`Invalid size for variant ${v.name}`);
          }

          if (variantPrice !== null && Number.isNaN(variantPrice)) {
            throw new Error(`Invalid price for variant ${v.name}`);
          }

          const stockQuantity = Number.isFinite(Number(v.stockQuantity))
            ? Math.max(0, Math.floor(Number(v.stockQuantity)))
            : 0;

          const variantData = {
            sku: String(v.sku).trim(),
            name: String(v.name).trim(),
            sizeValue,
            sizeUnit: v.sizeUnit === "L" ? ("L" as const) : ("ML" as const),
            price: variantPrice !== null ? String(variantPrice) : null,
            imageUrl: v.imageUrl?.trim() || null,
            stockQuantity,
          };

          if (v.id && existingVariantIds.has(v.id)) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: variantData,
            });
          } else {
            await tx.productVariant.create({
              data: { ...variantData, productId: id },
            });
          }
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: {
          variants: {
            orderBy: { sizeValue: "asc" },
          },
        },
      });
    });

    return NextResponse.json({
      id: updatedProduct.id,
      code: updatedProduct.code,
      name: updatedProduct.name,
      description: updatedProduct.description,
      status: updatedProduct.status,
      imageUrl: updatedProduct.imageUrl,
      imageUrl2: updatedProduct.imageUrl2,
      price:
        updatedProduct.price !== null
          ? Number(updatedProduct.price)
          : null,
      isFeatured: updatedProduct.isFeatured,
      category: updatedProduct.category,
      variants: updatedProduct.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        sizeValue: Number(v.sizeValue),
        sizeUnit: v.sizeUnit,
        price: v.price !== null ? Number(v.price) : null,
        imageUrl: v.imageUrl,
        stockQuantity: v.stockQuantity,
        status: v.status,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update product";

    if (/SKU|variant|Invalid|required/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error("PATCH product error:", error);

    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
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