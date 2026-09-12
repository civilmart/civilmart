import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import { isValidUnit } from "@/lib/catalog";

const purchaseInclude = {
  supplier: true,
  items: {
    include: {
      product: true,
      variant: true,
    },
  },
} as const;

type PreparedItem = {
  productId: string;
  variantId: string | null;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  notes: string | null;
};

export async function GET() {
  try {
    const purchases = await prisma.purchase.findMany({
      include: purchaseInclude,
      orderBy: { purchaseDate: "desc" },
    });

    return NextResponse.json({ success: true, data: purchases });
  } catch (error) {
    console.error("Failed to fetch purchases:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch purchases" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUserOrThrow();
    const body = await request.json();

    const {
      purchaseNo,
      supplierId,
      purchaseDate,
      items,
      tax = 0,
      discount = 0,
      notes,
    } = body;

    if (!purchaseNo || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Purchase number and at least one item are required",
        },
        { status: 400 }
      );
    }

    const existingPurchase = await prisma.purchase.findUnique({
      where: { purchaseNo },
    });

    if (existingPurchase) {
      return NextResponse.json(
        { success: false, error: "Purchase number already exists" },
        { status: 400 }
      );
    }

    const numericTax = Number(tax) || 0;
    const numericDiscount = Number(discount) || 0;

    if (numericTax < 0 || numericDiscount < 0) {
      return NextResponse.json(
        { success: false, error: "Tax and discount cannot be negative" },
        { status: 400 }
      );
    }

    const preparedItems: PreparedItem[] = [];

    for (const item of items) {
      const { productId, variantId, quantity, unit, costPerUnit, notes: itemNotes } =
        item;

      if (!productId || !quantity || !unit || costPerUnit === undefined) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Each purchase item requires product, quantity, unit, and cost per unit",
          },
          { status: 400 }
        );
      }

      if (!isValidUnit(String(unit))) {
        return NextResponse.json(
          { success: false, error: `Invalid unit: ${unit}` },
          { status: 400 }
        );
      }

      const numericQuantity = Number(quantity);
      const numericCost = Number(costPerUnit);

      if (
        !Number.isFinite(numericQuantity) ||
        numericQuantity <= 0 ||
        !Number.isFinite(numericCost) ||
        numericCost < 0
      ) {
        return NextResponse.json(
          { success: false, error: "Invalid quantity or cost per unit" },
          { status: 400 }
        );
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return NextResponse.json(
          { success: false, error: `Product not found: ${productId}` },
          { status: 404 }
        );
      }

      let variantIdResolved = variantId || null;

      if (variantIdResolved) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: variantIdResolved },
        });

        if (!variant || variant.productId !== productId) {
          return NextResponse.json(
            { success: false, error: "Variant does not belong to the product" },
            { status: 400 }
          );
        }
      }

      preparedItems.push({
        productId,
        variantId: variantIdResolved,
        quantity: numericQuantity,
        unit: String(unit),
        costPerUnit: numericCost,
        totalCost: numericQuantity * numericCost,
        notes: itemNotes || null,
      });
    }

    const subtotal = preparedItems.reduce((sum, item) => sum + item.totalCost, 0);
    const totalAmount = subtotal + numericTax - numericDiscount;

    if (totalAmount < 0) {
      return NextResponse.json(
        { success: false, error: "Total purchase amount cannot be negative" },
        { status: 400 }
      );
    }

    const purchase = await prisma.$transaction(async (tx) => {
      const createdPurchase = await tx.purchase.create({
        data: {
          purchaseNo,
          supplierId: supplierId || null,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          status: "RECEIVED",
          subtotal,
          tax: numericTax,
          discount: numericDiscount,
          totalAmount,
          notes: notes || null,
        },
      });

      for (const item of preparedItems) {
        await tx.purchaseItem.create({
          data: {
            purchaseId: createdPurchase.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unit: item.unit,
            costPerUnit: item.costPerUnit,
            totalCost: item.totalCost,
            notes: item.notes,
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            transactionType: "PURCHASE",
            quantity: item.quantity,
            unit: item.unit,
            referenceType: "PURCHASE",
            referenceId: createdPurchase.id,
            notes: `Purchase ${purchaseNo}`,
            createdById: user.id,
          },
        });

        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stockQuantity: true },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: String(
              Number(product?.stockQuantity ?? 0) + item.quantity
            ),
          },
        });
      }

      return createdPurchase;
    });

    const completePurchase = await prisma.purchase.findUnique({
      where: { id: purchase.id },
      include: purchaseInclude,
    });

    return NextResponse.json(
      { success: true, data: completePurchase },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create purchase:", error);

    return NextResponse.json(
      { success: false, error: "Failed to create purchase" },
      { status: 500 }
    );
  }
}