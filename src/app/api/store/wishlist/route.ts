import { NextRequest, NextResponse } from "next/server";
import { Prisma, ProductUnit } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCustomerUser } from "@/lib/customer";

type Numeric = Prisma.Decimal | string | number;

type WishlistProduct = {
  id: string;
  code: string;
  name: string;
  brand: string | null;
  description: string | null;
  unit: ProductUnit;
  stockQuantity: Numeric;
  imageUrl: string | null;
  imageUrl2: string | null;
  isFeatured: boolean;
  price: Numeric | null;
  subcategory: string | null;
  trades: string[];
  category: { id: string; name: string; slug: string } | null;
  variants: Array<{
    id: string;
    sku: string;
    name: string;
    sizeValue: Numeric;
    sizeUnit: ProductUnit;
    price: Numeric | null;
    imageUrl: string | null;
  }>;
};

function serializeProduct(p: WishlistProduct) {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    brand: p.brand,
    description: p.description,
    unit: p.unit,
    stockQuantity: Number(p.stockQuantity),
    imageUrl: p.imageUrl,
    imageUrl2: p.imageUrl2,
    category: p.category?.name ?? null,
    categorySlug: p.category?.slug ?? null,
    subcategory: p.subcategory,
    trades: p.trades,
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
    })),
  };
}

export async function GET() {
  const customer = await getCustomerUser();

  if (!customer) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const items = await prisma.customerWishlistItem.findMany({
    where: { customerId: customer.id },
    select: {
      id: true,
      createdAt: true,
      product: {
        select: {
          id: true,
          code: true,
          name: true,
          brand: true,
          description: true,
          unit: true,
          stockQuantity: true,
          imageUrl: true,
          imageUrl2: true,
          isFeatured: true,
          price: true,
          subcategory: true,
          trades: true,
          category: { select: { id: true, name: true, slug: true } },
          variants: {
            select: {
              id: true,
              sku: true,
              name: true,
              sizeValue: true,
              sizeUnit: true,
              price: true,
              imageUrl: true,
            },
            orderBy: { sizeValue: "asc" },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: items.map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      product: serializeProduct(item.product),
    })),
  });
}

export async function POST(request: NextRequest) {
  const customer = await getCustomerUser();

  if (!customer) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product is required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, status: "ACTIVE" },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const existing = await prisma.customerWishlistItem.findUnique({
      where: {
        customerId_productId: {
          customerId: customer.id,
          productId,
        },
      },
    });

    if (existing) {
      await prisma.customerWishlistItem.delete({ where: { id: existing.id } });

      return NextResponse.json({ success: true, data: { wishlisted: false } });
    }

    await prisma.customerWishlistItem.create({
      data: { customerId: customer.id, productId },
    });

    return NextResponse.json(
      { success: true, data: { wishlisted: true } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Wishlist toggle failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to update wishlist" },
      { status: 500 }
    );
  }
}