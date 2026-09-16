import { prisma } from "@/lib/prisma";
import { getSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { type StoreProduct, type StoreVariant } from "@/lib/store-front";
import { type StoreHomeData, type MainCategoryTile } from "@/app/api/store/home/route";

function mapProduct(p: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit: string;
  stockQuantity: unknown;
  imageUrl: string | null;
  imageUrl2: string | null;
  category: { name: string; slug: string | null } | null;
  subcategory: string | null;
  trades: string[];
  isFeatured: boolean;
  variants: Array<{
    id: string;
    sku: string;
    name: string;
    sizeValue: unknown;
    sizeUnit: string;
    imageUrl: string | null;
  }>;
}): StoreProduct {
  return {
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
  };
}

export async function getFeaturedProducts(limit = 8): Promise<StoreProduct[]> {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", isFeatured: true },
    include: {
      category: { select: { name: true, slug: true } },
      variants: { orderBy: { sizeValue: "asc" } },
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  return products.map(mapProduct);
}

export async function getLatestProducts(limit = 8): Promise<StoreProduct[]> {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    include: {
      category: { select: { name: true, slug: true } },
      variants: { orderBy: { sizeValue: "asc" } },
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  return products.map(mapProduct);
}

export async function getHomeData(): Promise<StoreHomeData> {
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
    const key = category.group?.trim() || null;
    if (key) {
      const list = groups.get(key) ?? [];
      list.push({ id: category.id, name: category.name });
      groups.set(key, list);
    } else {
      standalone.push({ id: category.id, name: category.name });
    }
  }

  const categoryIds = categories.map((c) => c.id);
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
        explicitImage.get(category.id) ?? imageByCategory.get(category.id);
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

  const totalProducts = await prisma.product.count({
    where: { status: "ACTIVE" },
  });

  return {
    mainCategories: sortedTiles,
    categoryCount: categories.length,
    productCount: totalProducts,
  };
}

export async function getProductById(id: string): Promise<StoreProduct | null> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { name: true, slug: true } },
      variants: { orderBy: { sizeValue: "asc" } },
    },
  });

  if (!product) return null;

  return mapProduct(product);
}

export async function getRelatedProducts(
  productId: string,
  categoryName: string | null,
  limit = 4
): Promise<StoreProduct[]> {
  if (!categoryName) {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE", id: { not: productId } },
      include: {
        category: { select: { name: true, slug: true } },
        variants: { orderBy: { sizeValue: "asc" } },
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    });
    return products.map(mapProduct);
  }

  const category = await prisma.category.findFirst({
    where: { name: categoryName },
    select: { id: true },
  });

  if (!category) return [];

  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      categoryId: category.id,
      id: { not: productId },
    },
    include: {
      category: { select: { name: true, slug: true } },
      variants: { orderBy: { sizeValue: "asc" } },
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  return products.map(mapProduct);
}

export async function getSiteSettingsData(): Promise<SiteSettings> {
  return getSiteSettings();
}
