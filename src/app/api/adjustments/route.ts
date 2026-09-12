import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import { isValidUnit } from "@/lib/catalog";

export async function POST(request: Request) {
  try {
    const user = await getSessionUserOrThrow();
    const body = await request.json();

    const { productId, variantId, adjustmentType, quantity, unit, reason, notes } =
      body;

    const sizeOk =
      Number.isFinite(Number(quantity)) && Number(quantity) > 0;

    if (!productId || !adjustmentType || !unit || !reason || !sizeOk) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Product, adjustment type, quantity, unit, and reason are required",
        },
        { status: 400 }
      );
    }

    if (
      adjustmentType !== "ADJUSTMENT_IN" &&
      adjustmentType !== "ADJUSTMENT_OUT"
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid adjustment type" },
        { status: 400 }
      );
    }

    if (!isValidUnit(String(unit))) {
      return NextResponse.json(
        { success: false, error: "Invalid unit" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    if (variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant || variant.productId !== productId) {
        return NextResponse.json(
          { success: false, error: "Variant not found for this product" },
          { status: 404 }
        );
      }
    }

    const numericQuantity = Number(quantity);

    if (adjustmentType === "ADJUSTMENT_OUT") {
      const current = Number(product.stockQuantity);

      if (numericQuantity > current) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot adjust out ${numericQuantity}: only ${current} in stock`,
          },
          { status: 400 }
        );
      }
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const record = await tx.inventoryTransaction.create({
        data: {
          productId,
          variantId: variantId || null,
          transactionType: adjustmentType,
          quantity: numericQuantity,
          unit,
          referenceType: "INVENTORY_ADJUSTMENT",
          referenceId: variantId || productId,
          notes: `${reason}${notes ? ` — ${notes}` : ""}`,
          createdById: user.id,
        },
        include: {
          product: true,
          variant: true,
        },
      });

      const newStock =
        adjustmentType === "ADJUSTMENT_IN"
          ? Number(product.stockQuantity) + numericQuantity
          : Number(product.stockQuantity) - numericQuantity;

      await tx.product.update({
        where: { id: productId },
        data: { stockQuantity: String(newStock) },
      });

      return record;
    });

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error) {
    console.error("Failed to create inventory adjustment:", error);

    return NextResponse.json(
      { success: false, error: "Failed to create inventory adjustment" },
      { status: 500 }
    );
  }
}