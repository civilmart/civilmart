import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [categories, brandGroups] = await Promise.all([
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
      prisma.product.groupBy({
        by: ["brand"],
        where: { status: "ACTIVE", brand: { not: null } },
        _count: { _all: true },
        orderBy: { brand: "asc" },
      }),
    ]);

    const groups: Array<{
      name: string;
      categories: Array<{ id: string; name: string; slug: string | null; count: number }>;
    }> = [];

    for (const category of categories) {
      const groupName = category.group?.trim() || "Other categories";
      let group = groups.find((g) => g.name === groupName);

      if (!group) {
        group = { name: groupName, categories: [] };
        groups.push(group);
      }

      group.categories.push({
        id: category.id,
        name: category.name,
        slug: category.slug,
        count: category._count.products,
      });
    }

    const brands = brandGroups
      .filter((b) => typeof b.brand === "string")
      .map((b) => ({
        name: b.brand as string,
        count: b._count._all,
      }));

    return NextResponse.json({ success: true, data: { groups, brands } });
  } catch (error) {
    console.error("Store filters error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch filters" },
      { status: 500 }
    );
  }
}