import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const OUTGOING = new Set([
  "SALE",
  "PURCHASE_RETURN",
  "TRANSFER_OUT",
  "ADJUSTMENT_OUT",
]);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "productId is required" },
        { status: 400 }
      );
    }

    const transactions = await prisma.inventoryTransaction.findMany({
      where: { productId },
      include: {
        product: {
          select: { id: true, code: true, name: true, unit: true },
        },
        variant: {
          select: { id: true, sku: true, name: true, sizeValue: true, sizeUnit: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    let runningBalance = 0;

    const ledger = transactions.map((tx) => {
      const quantity = Number(tx.quantity);
      const isIncoming = !OUTGOING.has(tx.transactionType);

      runningBalance += isIncoming ? quantity : -quantity;

      return {
        id: tx.id,
        transactionType: tx.transactionType,
        quantity,
        isIncoming,
        unit: tx.unit,
        variantId: tx.variantId,
        variant: tx.variant,
        referenceType: tx.referenceType,
        referenceId: tx.referenceId,
        notes: tx.notes,
        createdBy: tx.createdBy,
        createdAt: tx.createdAt.toISOString(),
        runningBalance,
      };
    });

    return NextResponse.json({
      success: true,
      product: transactions[0]?.product ?? null,
      data: ledger,
    });
  } catch (error) {
    console.error("Failed to fetch inventory ledger:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch inventory ledger" },
      { status: 500 }
    );
  }
}