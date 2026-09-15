import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const categoryId = url.searchParams.get("categoryId");

    const where: Record<string, unknown> = { active: true };
    if (categoryId) where.categoryId = categoryId;

    const brands = await prisma.brand.findMany({
      where,
      orderBy: { name: "asc" },
      include: { category: { select: { id: true, name: true, group: true } } },
    });

    return NextResponse.json(brands);
  } catch (error) {
    console.error("GET brands error:", error);
    return NextResponse.json({ error: "Failed to fetch brands" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getSessionUserOrThrow();
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const categoryId = body.categoryId ? String(body.categoryId).trim() : null;

    if (!name) {
      return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
    }

    const existing = await prisma.brand.findFirst({
      where: { name, categoryId: categoryId || null },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Brand already exists for this category" },
        { status: 409 }
      );
    }

    const brand = await prisma.brand.create({
      data: { name, categoryId: categoryId || null },
      include: { category: { select: { id: true, name: true, group: true } } },
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error("POST brand error:", error);
    return NextResponse.json({ error: "Failed to create brand" }, { status: 500 });
  }
}
