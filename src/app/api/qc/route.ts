import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const records = await prisma.qualityControl.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        productionBatch: {
          include: {
            product: true,
            productVariant: true,
            formula: true,
            formulaVersion: true,
          },
        },
      },
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error("Failed to load QC records:", error);

    return NextResponse.json(
      { error: "Failed to load QC records." },
      { status: 500 }
    );
  }
}
