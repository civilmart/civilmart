import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerUser } from "@/lib/customer";

function serializeProduct(p: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageUrl2: string | null;
  category: string | null;
  isFeatured: boolean;
  price: number | null;
  variants: {
    id: string;
    sku: string;
    name: string;
    sizeValue: number;
    sizeUnit: string;
    price: number | null;
    imageUrl: string | null;
    stockQuantity: number;
  }[];
}) {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    imageUrl: p.imageUrl,
    imageUrl2: p.imageUrl2,
    category: p.category,
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
      stockQuantity: v.stockQuantity,
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
    include: {
      product: {
        include: {
          variants: {
            where: { status: "ACTIVE" },
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
      product: serializeProduct({
        id: item.product.id,
        code: item.product.code,
        name: item.product.name,
        description: item.product.description,
        imageUrl: item.product.imageUrl,
        imageUrl2: item.product.imageUrl2,
        category: item.product.category,
        isFeatured: item.product.isFeatured,
        price: item.product.price !== null ? Number(item.product.price) : null,
        variants: item.product.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          name: v.name,
          sizeValue: Number(v.sizeValue),
          sizeUnit: v.sizeUnit,
          price: v.price !== null ? Number(v.price) : null,
          imageUrl: v.imageUrl,
          stockQuantity: v.stockQuantity,
        })),
      }),
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