import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await getSessionUserOrThrow();
    const { id } = await context.params;

    const brand = await prisma.brand.findUnique({ where: { id } });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const linkedCount = await prisma.supplierProduct.count({
      where: { brandId: id },
    });

    if (linkedCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${linkedCount} supplier product(s) use this brand` },
        { status: 409 }
      );
    }

    await prisma.brand.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE brand error:", error);
    return NextResponse.json({ error: "Failed to delete brand" }, { status: 500 });
  }
}
