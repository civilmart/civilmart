import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import { AD_SLOTS, isAdSlot } from "@/lib/ads";

export async function GET() {
  try {
    await getSessionUserOrThrow();

    const ads = await prisma.adPlacement.findMany({
      orderBy: [{ slot: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ success: true, data: ads });
  } catch (error) {
    console.error("Ads list error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch ads" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await getSessionUserOrThrow();

    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const slot = String(body.slot ?? "").trim();
    const subtitle = (body.subtitle ?? "").toString().trim() || null;
    const imageUrl = String(body.imageUrl ?? "").trim() || null;
    const href = String(body.href ?? "").trim() || null;
    const active = body.active !== false;
    const sortOrderRaw = Number(body.sortOrder);
    const sortOrder = Number.isFinite(sortOrderRaw)
      ? Math.max(0, Math.trunc(sortOrderRaw))
      : 0;

    if (!title) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 }
      );
    }

    if (!isAdSlot(slot)) {
      return NextResponse.json(
        {
          success: false,
          error: `Slot must be one of: ${AD_SLOTS.map((s) => s.value).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const ad = await prisma.adPlacement.create({
      data: { title, slot, subtitle, imageUrl, href, active, sortOrder },
    });

    return NextResponse.json({ success: true, data: ad });
  } catch (error) {
    console.error("Ad create error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to create ad" },
      { status: 500 }
    );
  }
}