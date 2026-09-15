import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import { slugify } from "@/lib/catalog";

export async function GET() {
  try {
    const trades = await prisma.trade.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { categories: true } } },
    });

    return NextResponse.json(trades);
  } catch (error) {
    console.error("GET trades error:", error);
    return NextResponse.json({ error: "Failed to fetch trades" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getSessionUserOrThrow();
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim() || null;
    const sortOrder = Number(body.sortOrder ?? 0);

    if (!name) {
      return NextResponse.json({ error: "Trade name is required" }, { status: 400 });
    }

    const existing = await prisma.trade.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "Trade name already exists" }, { status: 409 });
    }

    let slug = slugify(name);
    const clash = await prisma.trade.findUnique({ where: { slug } });
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 8)}`;

    const trade = await prisma.trade.create({
      data: { name, slug, description, sortOrder },
    });

    return NextResponse.json(trade, { status: 201 });
  } catch (error) {
    console.error("POST trade error:", error);
    return NextResponse.json({ error: "Failed to create trade" }, { status: 500 });
  }
}
