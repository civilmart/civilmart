import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE", category: { not: null } },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    });

    const categories = products
      .map((p) => p.category)
      .filter((c): c is string => c !== null)
      .sort();

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error("Store categories error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}