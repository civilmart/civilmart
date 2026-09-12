import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AD_SLOTS, isAdSlot } from "@/lib/ads";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slotParam = searchParams.get("slot")?.trim();

    if (slotParam && !isAdSlot(slotParam)) {
      return NextResponse.json(
        {
          success: false,
          error: `Slot must be one of: ${AD_SLOTS.map((s) => s.value).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const ads = await prisma.adPlacement.findMany({
      where: { active: true, ...(slotParam ? { slot: slotParam } : {}) },
      orderBy: [{ slot: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        slot: true,
        title: true,
        subtitle: true,
        imageUrl: true,
        href: true,
        sortOrder: true,
      },
    });

    return NextResponse.json({ success: true, data: ads });
  } catch (error) {
    console.error("Store ads error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch ads" },
      { status: 500 }
    );
  }
}