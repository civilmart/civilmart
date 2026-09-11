import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const material = await prisma.rawMaterial.findUnique({
      where: {
        id: "cmtu9xzgq00013ku983bdfpqw",
      },
      include: {
        lots: {
          orderBy: {
            createdAt: "asc",
          },
        },
        inventoryTransactions: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!material) {
      return NextResponse.json(
        { error: "Lavender Oil not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      material: {
        id: material.id,
        code: material.code,
        name: material.name,
        unitType: material.unitType,
      },

      lots: material.lots.map((lot) => ({
        id: lot.id,
        lotNumber: lot.lotNumber,
        receivedQty: Number(lot.receivedQty),
        unit: lot.unit,
      })),

      transactions: material.inventoryTransactions.map(
        (tx) => ({
          id: tx.id,
          type: tx.transactionType,
          quantity: Number(tx.quantity),
          unit: tx.unit,
          unitType: tx.unitType,
          lotId: tx.lotId,
          referenceType: tx.referenceType,
          referenceId: tx.referenceId,
          notes: tx.notes,
          createdAt: tx.createdAt,
        })
      ),
    });
  } catch (error) {
    console.error("Lavender inventory diagnostic error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Diagnostic failed",
      },
      { status: 500 }
    );
  }
}