import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type MainCategoryTile = {
  key: string;
  name: string;
  kind: "group" | "category";
  href: string;
  productCount: number;
  categoryCount: number;
  imageUrl: string | null;
};

export type StoreHomeData = {
  mainCategories: MainCategoryTile[];
  categoryCount: number;
  productCount: number;
};

function groupKey(group: string | null): string | null {
  const trimmed = group?.trim();

  return trimmed ? trimmed : null;
}

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, group: true, imageUrl: true },
    });

    const explicitImage = new Map<string, string>();

    for (const category of categories) {
      const image = category.imageUrl?.trim();

      if (image?.startsWith("http")) {
        explicitImage.set(category.id, image);
      }
    }

    const groups = new Map<string, { id: string; name: string }[]>();
    const standalone: { id: string; name: string }[] = [];

    for (const category of categories) {
      const key = groupKey(category.group);

      if (key) {
        const list = groups.get(key) ?? [];
        list.push({ id: category.id, name: category.name });
        groups.set(key, list);
      } else {
        standalone.push({ id: category.id, name: category.name });
      }
    }

    const categoryIds = categories.map((category) => category.id);

    const countsByCategory = new Map<string, number>();

    const countRows = await prisma.product.groupBy({
      by: ["categoryId"],
      where: { status: "ACTIVE", categoryId: { in: categoryIds } },
      _count: { _all: true },
    });

    for (const row of countRows) {
      if (row.categoryId) {
        countsByCategory.set(row.categoryId, row._count._all);
      }
    }

    const imageByCategory = new Map<string, string>();

    const withImages = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        categoryId: { in: categoryIds },
        imageUrl: { not: null },
      },
      select: { categoryId: true, imageUrl: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });

    for (const product of withImages) {
      if (!product.imageUrl || !product.categoryId) continue;

      const image = product.imageUrl.trim();

      if (!image.startsWith("http")) continue;

      if (!imageByCategory.has(product.categoryId)) {
        imageByCategory.set(product.categoryId, image);
      }
    }

    const mainCategories: MainCategoryTile[] = [];

    for (const [group, list] of groups) {
      let imageUrl: string | null = null;

      for (const category of list) {
        const candidate =
          explicitImage.get(category.id) ??
          imageByCategory.get(category.id);

        if (candidate) {
          imageUrl = candidate;
          break;
        }
      }

      mainCategories.push({
        key: group,
        name: group,
        kind: "group",
        href: `/products?group=${encodeURIComponent(group)}`,
        productCount: list.reduce(
          (sum, category) => sum + (countsByCategory.get(category.id) ?? 0),
          0
        ),
        categoryCount: list.length,
        imageUrl,
      });
    }

    for (const category of standalone) {
      mainCategories.push({
        key: category.name,
        name: category.name,
        kind: "category",
        href: `/products?category=${encodeURIComponent(category.name)}`,
        productCount: countsByCategory.get(category.id) ?? 0,
        categoryCount: 1,
        imageUrl:
          explicitImage.get(category.id) ??
          imageByCategory.get(category.id) ??
          null,
      });
    }

    const merged = new Map<string, MainCategoryTile>();

    for (const tile of mainCategories) {
      const existing = merged.get(tile.name);

      if (!existing) {
        merged.set(tile.name, tile);
        continue;
      }

      existing.productCount += tile.productCount;
      existing.categoryCount += tile.categoryCount;

      if (!existing.imageUrl && tile.imageUrl) {
        existing.imageUrl = tile.imageUrl;
      }

      if (existing.kind === "category") {
        existing.kind = "group";
        existing.href = `/products?group=${encodeURIComponent(existing.name)}`;
      }
    }

    const sortedTiles = [...merged.values()];

    sortedTiles.sort(
      (a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name)
    );

    const totalProducts = await prisma.product.count({ where: { status: "ACTIVE" } });

    const data: StoreHomeData = {
      mainCategories: sortedTiles,
      categoryCount: categories.length,
      productCount: totalProducts,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Store home error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch store home" },
      { status: 500 }
    );
  }
}