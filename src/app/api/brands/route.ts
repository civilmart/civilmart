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
    const raw = String(body.name ?? "").trim();
    const categoryId = body.categoryId ? String(body.categoryId).trim() : null;

    if (!raw) {
      return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
    }

    const names = raw
      .split(/[,\n]+/)
      .map((n: string) => n.trim())
      .filter(Boolean);

    const created: string[] = [];
    const skipped: string[] = [];

    for (const name of names) {
      const existing = await prisma.brand.findFirst({
        where: { name, categoryId: categoryId || null },
      });

      if (existing) {
        skipped.push(name);
        continue;
      }

      await prisma.brand.create({
        data: { name, categoryId: categoryId || null },
      });
      created.push(name);
    }

    return NextResponse.json({ created, skipped }, { status: 201 });
  } catch (error) {
    console.error("POST brand error:", error);
    return NextResponse.json({ error: "Failed to create brand(s)" }, { status: 500 });
  }
}
