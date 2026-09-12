import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ group: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: categories.map((c) => c.name),
    });
  } catch (error) {
    console.error("Store categories error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}