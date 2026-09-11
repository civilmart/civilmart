import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawMaterialId = searchParams.get("rawMaterialId");
    const lotId = searchParams.get("lotId");

    if (!rawMaterialId && !lotId) {
      return NextResponse.json(
        { success: false, error: "rawMaterialId or lotId is required" },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = {};

    if (rawMaterialId) {
      where.rawMaterialId = rawMaterialId;
    }

    if (lotId) {
      where.lotId = lotId;
    }

    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      include: {
        rawMaterial: {
          select: { id: true, code: true, name: true, unitType: true },
        },
        lot: {
          select: { id: true, lotNumber: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    let runningBalance = 0;

    const ledger = transactions.map((tx) => {
      const quantity = Number(tx.quantity);
      const isIncoming = [
        "PURCHASE",
        "RETURN",
        "TRANSFER_IN",
        "OPENING_BALANCE",
        "ADJUSTMENT_IN",
        "CORRECTION",
      ].includes(tx.transactionType);

      if (isIncoming) {
        runningBalance += quantity;
      } else {
        runningBalance -= quantity;
      }

      return {
        id: tx.id,
        transactionType: tx.transactionType,
        quantity,
        unit: tx.unit,
        unitType: tx.unitType,
        referenceType: tx.referenceType,
        referenceId: tx.referenceId,
        notes: tx.notes,
        createdAt: tx.createdAt.toISOString(),
        lot: tx.lot,
        rawMaterial: tx.rawMaterial,
        runningBalance,
      };
    });

    return NextResponse.json({ success: true, data: ledger });
  } catch (error) {
    console.error("Failed to fetch inventory ledger:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch inventory ledger" },
      { status: 500 }
    );
  }
}
