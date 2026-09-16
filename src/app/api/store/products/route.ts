import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { type StoreProduct } from "@/lib/store-front";
import type { StoreProductListItem } from "@/types/api";

type SortKey = "featured" | "newest" | "name_asc" | "price_asc" | "price_desc";

function parseNumber(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function effectivePriceOf(product: StoreProduct): number | null {
  return product.retailPrice ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("search")?.trim();
    const category = searchParams.get("category")?.trim();
    const group = searchParams.get("group")?.trim();
    const subcategory = searchParams.get("subcategory")?.trim();
    const featuredOnly = searchParams.get("featured") === "true";
    const inStockOnly = searchParams.get("inStock") === "true";
    const priceMin = parseNumber(searchParams.get("priceMin"));
    const priceMax = parseNumber(searchParams.get("priceMax"));
    const sort = (searchParams.get("sort") ?? "featured") as SortKey;
    const limitRaw = parseNumber(searchParams.get("limit"));
    const legacyMode = searchParams.has("limit");
    const limit = Math.min(limitRaw ?? 100, 100);
    const page = Math.max(1, parseNumber(searchParams.get("page")) ?? 1);
    const pageSize = Math.min(Math.max(1, parseNumber(searchParams.get("pageSize")) ?? 24), 48);

    const categoryFilter: { name?: string; group?: string; OR?: Array<{ group: string } | { name: string }> } = {};

    if (category) categoryFilter.name = category;
    if (group) categoryFilter.OR = [{ group }, { name: group }];

    const where = {
      status: "ACTIVE" as const,
      ...(Object.keys(categoryFilter).length > 0 ? { category: categoryFilter } : {}),
      ...(subcategory ? { subcategory } : {}),
      ...(featuredOnly ? { isFeatured: true } : {}),
      ...(inStockOnly ? { stockQuantity: { gt: 0 } } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { code: { contains: query, mode: "insensitive" as const } },
              { subcategory: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: { orderBy: { sizeValue: "asc" } },
      },
    });

    const data = products.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
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
      retailPrice: null,
      variants: p.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        sizeValue: Number(v.sizeValue),
        sizeUnit: v.sizeUnit,
        imageUrl: v.imageUrl,
      })),
    }));

    let filtered = data;

    if (priceMin !== null || priceMax !== null) {
      filtered = filtered.filter((product) => {
        const price = effectivePriceOf(product);

        if (price === null) return false;
        if (priceMin !== null && price < priceMin) return false;
        if (priceMax !== null && price > priceMax) return false;

        return true;
      });
    }

    const priceSort = sort === "price_asc" || sort === "price_desc";

    switch (sort) {
      case "name_asc":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "price_asc":
        filtered.sort((a, b) => {
          const pa = effectivePriceOf(a);
          const pb = effectivePriceOf(b);

          if (pa === null && pb === null) return 0;
          if (pa === null) return 1;
          if (pb === null) return -1;

          return pa - pb;
        });
        break;
      case "price_desc":
        filtered.sort((a, b) => {
          const pa = effectivePriceOf(a);
          const pb = effectivePriceOf(b);

          if (pa === null && pb === null) return 0;
          if (pa === null) return 1;
          if (pb === null) return -1;

          return pb - pa;
        });
        break;
      default:
        if (priceSort) {
          break;
        }

        filtered.sort((a, b) => {
          if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;

          return a.name.localeCompare(b.name);
        });
    }

    if (legacyMode) {
      return NextResponse.json({ success: true, data: filtered.slice(0, limit) as unknown as StoreProductListItem[] });
    }

    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const pageData = filtered.slice(start, start + pageSize);

    return NextResponse.json({
      success: true,
      data: {
        total,
        page: Math.min(page, pages),
        pageSize,
        pages,
        products: pageData as unknown as StoreProductListItem[],
      },
    });
  } catch (error) {
    console.error("Store products error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}