import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getDaysUntilExpiry, getExpiryStatus } from "@/lib/expiry";

// ============================================================
// EXPIRY / RETEST ALERTS
// ============================================================
// Raw-material lots have always stored an expiry date, but
// nothing turned that into a flag. This endpoint returns every
// lot that is EXPIRED or EXPIRING_SOON *and* still has remaining
// stock — a lot that's fully consumed doesn't need a retest.
// ============================================================

export async function GET() {
  try {
    const lots = await prisma.rawMaterialLot.findMany({
      where: {
        expiryDate: { not: null },
      },
      include: {
        rawMaterial: true,
        supplier: true,
      },
    });

    if (lots.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          alerts: [],
          summary: { expired: 0, expiringSoon: 0 },
        },
      });
    }

    const lotIds = lots.map((lot) => lot.id);

    const transactions = await prisma.inventoryTransaction.findMany({
      where: { lotId: { in: lotIds } },
      select: {
        lotId: true,
        transactionType: true,
        quantity: true,
      },
    });

    const balanceByLot = new Map<string, number>();

    for (const transaction of transactions) {
      if (!transaction.lotId) continue;

      const quantity = Number(transaction.quantity);
      const current = balanceByLot.get(transaction.lotId) ?? 0;

      switch (transaction.transactionType) {
        case "PURCHASE":
        case "RETURN":
        case "TRANSFER_IN":
        case "OPENING_BALANCE":
        case "ADJUSTMENT_IN":
        case "CORRECTION":
          balanceByLot.set(transaction.lotId, current + quantity);
          break;

        case "CONSUMPTION":
        case "TRANSFER_OUT":
        case "ADJUSTMENT_OUT":
          balanceByLot.set(transaction.lotId, current - quantity);
          break;

        default:
          break;
      }
    }

    const now = new Date();

    const alerts = lots
      .map((lot) => {
        const status = getExpiryStatus(lot.expiryDate, now);
        const remainingQty = Math.max(
          balanceByLot.get(lot.id) ?? 0,
          0
        );

        return {
          id: lot.id,
          lotNumber: lot.lotNumber,
          expiryDate: lot.expiryDate,
          daysUntilExpiry: lot.expiryDate
            ? getDaysUntilExpiry(lot.expiryDate, now)
            : null,
          status,
          remainingQty,
          unit: lot.unit,
          rawMaterial: {
            id: lot.rawMaterial.id,
            code: lot.rawMaterial.code,
            name: lot.rawMaterial.name,
          },
          supplier: lot.supplier
            ? { id: lot.supplier.id, name: lot.supplier.name }
            : null,
        };
      })
      .filter(
        (lot) =>
          (lot.status === "EXPIRED" ||
            lot.status === "EXPIRING_SOON") &&
          lot.remainingQty > 0
      )
      .sort((a, b) => (a.daysUntilExpiry ?? 0) - (b.daysUntilExpiry ?? 0));

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        summary: {
          expired: alerts.filter((a) => a.status === "EXPIRED")
            .length,
          expiringSoon: alerts.filter(
            (a) => a.status === "EXPIRING_SOON"
          ).length,
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch expiry alerts:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch expiry alerts",
      },
      { status: 500 }
    );
  }
}
