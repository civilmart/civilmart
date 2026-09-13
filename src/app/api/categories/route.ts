import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import { slugify } from "@/lib/catalog";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const withCounts = url.searchParams.get("withCounts") === "true";

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ group: "asc" }, { name: "asc" }],
      ...(withCounts
        ? {
            include: {
              _count: { select: { products: { where: { status: "ACTIVE" } } } },
            },
          }
        : {}),
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET categories error:", error);

    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await getSessionUserOrThrow();
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const group = String(body.group ?? "").trim() || "General";
    const description = String(body.description ?? "").trim() || null;
    const imageUrl = String(body.imageUrl ?? "").trim() || null;

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.category.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Category name already exists" },
        { status: 409 }
      );
    }

    let slug = slugify(name);
    const clash = await prisma.category.findUnique({ where: { slug } });

    if (clash) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 8)}`;
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        group,
        description,
        imageUrl,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("POST category error:", error);

    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}