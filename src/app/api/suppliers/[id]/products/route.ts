import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

// ============================================================
// GET — list the supplier's rate list (supplier product lines)
// ============================================================

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await getSessionUserOrThrow();
    const { id: supplierId } = await context.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, name: true },
    });

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const items = await prisma.supplierProduct.findMany({
      where: { supplierId },
      include: {
        product: {
          include: {
            category: {
              select: { id: true, name: true, group: true, tradeId: true },
            },
            variants: {
              select: { id: true, name: true, sku: true, sizeValue: true, sizeUnit: true },
              orderBy: { sizeValue: "asc" },
            },
          },
        },
        brand: { select: { id: true, name: true } },
        variantPrices: {
          include: {
            productVariant: {
              select: { id: true, name: true, sku: true, sizeValue: true, sizeUnit: true },
            },
          },
        },
      },
      orderBy: [
        { product: { category: { group: "asc" } } },
        { product: { category: { name: "asc" } } },
        { product: { name: "asc" } },
      ],
    });

    return NextResponse.json({ supplier, items });
  } catch (error) {
    console.error("GET supplier products error:", error);

    return NextResponse.json(
      { error: "Failed to fetch supplier products" },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT — full replace of the rate list (JSON body: { items: [] })
//
// Each item:
//   {
//     action: "set" | "delete",
//     productId,
//     brandId?,
//     rate (rate list price),
//     discount (percent),
//     retailPrice,
//     notes?
//   }
//
// For "set": creates/updates the supplier link and updates the
// product's retail price (the price you sell the item at).
// ============================================================

type Decimal = number;
type SupplierProductVariantInput = {
  variantId: string;
  rate?: unknown;
  discount?: unknown;
  wholesalePrice?: unknown;
  retailPrice?: unknown;
};

type SupplierProductItem = {
  action?: string;
  productId?: string;
  brandId?: string;
  rate?: unknown;
  discount?: unknown;
  wholesalePrice?: unknown;
  retailPrice?: unknown;
  notes?: string;
  variants?: SupplierProductVariantInput[];
};

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await getSessionUserOrThrow();
    const { id: supplierId } = await context.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, name: true },
    });

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const body = await request.json();
    const items = Array.isArray(body.items)
      ? (body.items as SupplierProductItem[])
      : [];

    const productIds = items
      .map((item) => item.productId)
      .filter((id): id is string => Boolean(id));

    const productIdSet = new Set(productIds);

    const [existingProducts, existingLinks, genericBrand] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true },
      }),
      prisma.supplierProduct.findMany({
        where: { supplierId },
        select: { id: true, productId: true },
      }),
      prisma.brand.findFirst({
        where: { name: { equals: "generic", mode: "insensitive" } },
        select: { id: true },
      }),
    ]);

    const existingByProduct = new Map(
      existingLinks.map((link) => [link.productId, link.id])
    );
    const genericBrandId = genericBrand?.id ?? null;

    let created = 0;
    let updated = 0;
    let deleted = 0;

    for (const rawItem of items) {
      const productId = String(rawItem.productId ?? "");
      if (!productId) continue;

      if (rawItem.action === "delete") {
        const existingId = existingByProduct.get(productId);

        if (existingId) {
          await prisma.supplierProduct.delete({ where: { id: existingId } });
          deleted += 1;
          existingByProduct.delete(productId);
        }

        continue;
      }

      const brandId =
        rawItem.brandId && rawItem.brandId !== "generic"
          ? String(rawItem.brandId)
          : genericBrandId;

      const rate = toDecimalOrNull(rawItem.rate);
      const discount = toDecimalOrZero(rawItem.discount);
      const wholesalePrice = toDecimalOrNull(rawItem.wholesalePrice);
      const retailPrice = toDecimalOrNull(rawItem.retailPrice);

      if (!existingByProduct.has(productId)) {
        const sp = await prisma.supplierProduct.create({
          data: {
            supplierId,
            productId,
            brandId,
            rateListPrice: rate,
            discount,
            wholesalePrice,
            retailPrice,
            notes: rawItem.notes?.trim() || null,
          },
        });
        if (Array.isArray(rawItem.variants)) {
          await saveVariantPrices(sp.id, rawItem.variants);
        }
        created += 1;
      } else {
        const id = existingByProduct.get(productId)!;
        await prisma.supplierProduct.update({
          where: { id },
          data: { brandId, rateListPrice: rate, discount, wholesalePrice, retailPrice },
        });
        if (Array.isArray(rawItem.variants)) {
          await saveVariantPrices(id, rawItem.variants);
        }
        updated += 1;
      }
    }

    for (const link of existingLinks) {
      if (!productIdSet.has(link.productId)) {
        await prisma.supplierProduct.delete({ where: { id: link.id } });
        deleted += 1;
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      deleted,
      genericBrandId,
    });
  } catch (error) {
    console.error("PUT supplier products error:", error);

    return NextResponse.json(
      { error: "Failed to save supplier rate list" },
      { status: 500 }
    );
  }
}

// ============================================================
// Variant price helpers
// ============================================================

async function saveVariantPrices(
  supplierProductId: string,
  variants: SupplierProductVariantInput[]
) {
  const existing = await prisma.supplierProductVariant.findMany({
    where: { supplierProductId },
    select: { id: true, productVariantId: true },
  });
  const existingByVariant = new Map(
    existing.map((v) => [v.productVariantId, v.id])
  );

  const submittedVariantIds = new Set(
    variants.map((v) => v.variantId).filter(Boolean)
  );

  for (const rv of variants) {
    if (!rv.variantId) continue;
    const data = {
      rateListPrice: toDecimalOrNull(rv.rate),
      discount: toDecimalOrZero(rv.discount),
      wholesalePrice: toDecimalOrNull(rv.wholesalePrice),
      retailPrice: toDecimalOrNull(rv.retailPrice),
    };

    if (existingByVariant.has(rv.variantId)) {
      await prisma.supplierProductVariant.update({
        where: { id: existingByVariant.get(rv.variantId)! },
        data,
      });
    } else {
      await prisma.supplierProductVariant.create({
        data: { supplierProductId, productVariantId: rv.variantId, ...data },
      });
    }
  }

  for (const [variantId, id] of existingByVariant) {
    if (!submittedVariantIds.has(variantId)) {
      await prisma.supplierProductVariant.delete({ where: { id } });
    }
  }
}

// ============================================================
// Numeric helpers
// ============================================================

function toDecimalOrNull(value: unknown): Decimal | null {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toDecimalOrZero(value: unknown): Decimal {
  const num = toDecimalOrNull(value);
  return num === null || num < 0 ? 0 : num;
}
