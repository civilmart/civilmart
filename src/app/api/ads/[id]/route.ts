import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import { isAdSlot } from "@/lib/ads";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await getSessionUserOrThrow();

    const { id } = await context.params;
    const body = await request.json();

    const existing = await prisma.adPlacement.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Ad not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};

    if (typeof body.title === "string") {
      const title = body.title.trim();

      if (!title) {
        return NextResponse.json(
          { success: false, error: "Title is required" },
          { status: 400 }
        );
      }

      data.title = title;
    }

    if (typeof body.slot === "string") {
      const slot = body.slot.trim();

      if (!isAdSlot(slot)) {
        return NextResponse.json(
          { success: false, error: "Invalid slot" },
          { status: 400 }
        );
      }

      data.slot = slot;
    }

    if (typeof body.subtitle === "string") {
      data.subtitle = body.subtitle.trim() || null;
    }

    if (typeof body.imageUrl === "string") {
      data.imageUrl = body.imageUrl.trim() || null;
    }

    if (typeof body.href === "string") {
      data.href = body.href.trim() || null;
    }

    if (typeof body.active === "boolean") {
      data.active = body.active;
    }

    if (typeof body.sortOrder === "number") {
      const sortOrder = Math.max(0, Math.trunc(body.sortOrder));

      if (Number.isFinite(sortOrder)) {
        data.sortOrder = sortOrder;
      }
    }

    const ad = await prisma.adPlacement.update({ where: { id }, data });

    return NextResponse.json({ success: true, data: ad });
  } catch (error) {
    console.error("Ad update error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to update ad" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await getSessionUserOrThrow();

    const { id } = await context.params;
    const existing = await prisma.adPlacement.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Ad not found" },
        { status: 404 }
      );
    }

    await prisma.adPlacement.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ad delete error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to delete ad" },
      { status: 500 }
    );
  }
}