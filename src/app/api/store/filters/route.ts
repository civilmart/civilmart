import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { type SubcategoryCount } from "@/lib/store-front";

function groupLabel(group: string | null): string {
  return group?.trim() || "Other categories";
}

export async function GET() {
  try {
    const [categories, subcategoryRows] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: [{ group: "asc" }, { name: "asc" }],
        include: {
          _count: {
            select: {
              products: { where: { status: "ACTIVE" } },
            },
          },
        },
      }),
      prisma.product.findMany({
        where: { status: "ACTIVE", subcategory: { not: null } },
        select: {
          subcategory: true,
          category: { select: { group: true } },
        },
      }),
    ]);

    const groups: Array<{
      name: string;
      categories: Array<{ id: string; name: string; slug: string | null; count: number }>;
    }> = [];

    for (const category of categories) {
      const groupName = groupLabel(category.group);
      let g = groups.find((item) => item.name === groupName);

      if (!g) {
        g = { name: groupName, categories: [] };
        groups.push(g);
      }

      g.categories.push({
        id: category.id,
        name: category.name,
        slug: category.slug,
        count: category._count.products,
      });
    }

    const byGroup = new Map<string, Map<string, number>>();

    for (const row of subcategoryRows) {
      if (!row.subcategory) continue;

      const groupName = groupLabel(row.category?.group ?? null);
      let groupMap = byGroup.get(groupName);

      if (!groupMap) {
        groupMap = new Map();
        byGroup.set(groupName, groupMap);
      }

      groupMap.set(row.subcategory, (groupMap.get(row.subcategory) ?? 0) + 1);
    }

    const subcategories: SubcategoryCount[] = [];

    for (const [group, counts] of byGroup) {
      for (const [name, count] of counts) {
        subcategories.push({ group, name, count });
      }
    }

    subcategories.sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name)
    );

    const brands: Array<{ name: string; count: number }> = [];

    return NextResponse.json({
      success: true,
      data: { groups, brands, subcategories },
    });
  } catch (error) {
    console.error("Store filters error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch filters" },
      { status: 500 }
    );
  }
}