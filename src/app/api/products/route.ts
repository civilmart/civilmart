import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        variants: {
          orderBy: {
            sizeValue: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
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
    const body = await request.json();

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

    const productPrice =
      price === undefined || price === null || price === ""
        ? null
        : Number(price);

    if (productPrice !== null && Number.isNaN(productPrice)) {
      return NextResponse.json(
        { error: "Invalid price" },
        { status: 400 }
      );
    }

    if (!Array.isArray(variants) || variants.length === 0) {
      return NextResponse.json(
        {
          error:
            "At least one product variant is required",
        },
        { status: 400 }
      );
    }

    const existingProduct = await prisma.product.findUnique({
      where: {
        code: code.trim(),
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: "Product code already exists" },
        { status: 409 }
      );
    }

    const preparedVariants = [];

    for (const variant of variants) {
      if (!variant.sku?.trim()) {
        return NextResponse.json(
          { error: "Each variant requires an SKU" },
          { status: 400 }
        );
      }

      if (!variant.name?.trim()) {
        return NextResponse.json(
          { error: "Each variant requires a name" },
          { status: 400 }
        );
      }

      const sizeValue = Number(variant.sizeValue);

      if (!Number.isFinite(sizeValue) || sizeValue <= 0) {
        return NextResponse.json(
          {
            error: `Invalid size for variant ${variant.name}`,
          },
          { status: 400 }
        );
      }

      const variantPrice =
        variant.price === undefined || variant.price === null || variant.price === ""
          ? null
          : Number(variant.price);

      if (variantPrice !== null && Number.isNaN(variantPrice)) {
        return NextResponse.json(
          {
            error: `Invalid price for variant ${variant.name}`,
          },
          { status: 400 }
        );
      }

      if (variant.sizeUnit !== "ML" && variant.sizeUnit !== "L") {
        return NextResponse.json(
          {
            error: `Invalid size unit for variant ${variant.name}`,
          },
          { status: 400 }
        );
      }

      const stockQuantity = Number.isFinite(Number(variant.stockQuantity))
        ? Math.max(0, Math.floor(Number(variant.stockQuantity)))
        : 0;

      preparedVariants.push({
        sku: variant.sku.trim(),
        name: variant.name.trim(),
        sizeValue,
        sizeUnit: variant.sizeUnit,
        price: variantPrice !== null ? String(variantPrice) : null,
        imageUrl: variant.imageUrl?.trim() || null,
        stockQuantity,
        status: "ACTIVE" as const,
      });
    }

    const skus = preparedVariants.map(
      (variant) => variant.sku
    );

    const existingVariants =
      await prisma.productVariant.findMany({
        where: {
          sku: {
            in: skus,
          },
        },
        select: {
          sku: true,
        },
      });

    if (existingVariants.length > 0) {
      return NextResponse.json(
        {
          error: `SKU already exists: ${existingVariants[0].sku}`,
        },
        { status: 409 }
      );
    }

    const product = await prisma.product.create({
      data: {
        code: code.trim(),
        name: name.trim(),
        description: description?.trim() || null,
        status: "ACTIVE",
        imageUrl: imageUrl?.trim() || null,
        imageUrl2: imageUrl2?.trim() || null,
        price: productPrice !== null ? String(productPrice) : null,
        category: category?.trim() || null,
        isFeatured: Boolean(isFeatured),

        variants: {
          create: preparedVariants,
        },
      },
      include: {
        variants: true,
      },
    });

    return NextResponse.json(product, {
      status: 201,
    });
  } catch (error) {
    console.error("POST product error:", error);

    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}