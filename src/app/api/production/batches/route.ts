import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const batches = await prisma.productionBatch.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        product: true,
        productVariant: true,
        formula: true,
        formulaVersion: true,
        materialConsumptions: {
          include: {
            rawMaterial: true,
            lot: true,
          },
        },
      },
    });

    return NextResponse.json(batches);
  } catch (error) {
    console.error("Failed to load production batches:", error);

    return NextResponse.json(
      { error: "Failed to load production batches." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const batchNumber = String(body.batchNumber ?? "").trim();
    const productId = String(body.productId ?? "").trim();
    const productVariantId = body.productVariantId
      ? String(body.productVariantId).trim()
      : null;
    const formulaId = String(body.formulaId ?? "").trim();
    const formulaVersionId = String(body.formulaVersionId ?? "").trim();

    const plannedQuantity = Number(body.plannedQuantity);

    if (!batchNumber) {
      return NextResponse.json(
        { error: "Batch number is required." },
        { status: 400 }
      );
    }

    if (!productId) {
      return NextResponse.json(
        { error: "Product is required." },
        { status: 400 }
      );
    }

    if (!formulaId) {
      return NextResponse.json(
        { error: "Formula is required." },
        { status: 400 }
      );
    }

    if (!formulaVersionId) {
      return NextResponse.json(
        { error: "Formula version is required." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(plannedQuantity) || plannedQuantity <= 0) {
      return NextResponse.json(
        { error: "Planned quantity must be greater than zero." },
        { status: 400 }
      );
    }

    const existingBatch = await prisma.productionBatch.findUnique({
      where: {
        batchNumber,
      },
    });

    if (existingBatch) {
      return NextResponse.json(
        { error: "Batch number already exists." },
        { status: 409 }
      );
    }

    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 }
      );
    }

    if (productVariantId) {
      const variant = await prisma.productVariant.findFirst({
        where: {
          id: productVariantId,
          productId,
        },
      });

      if (!variant) {
        return NextResponse.json(
          { error: "Product variant does not belong to the selected product." },
          { status: 400 }
        );
      }
    }

    const formula = await prisma.formula.findFirst({
      where: {
        id: formulaId,
        productId,
      },
      include: {
        versions: true,
      },
    });

    if (!formula) {
      return NextResponse.json(
        { error: "Formula not found for the selected product." },
        { status: 404 }
      );
    }

    const formulaVersion = formula.versions.find(
      (version) => version.id === formulaVersionId
    );

    if (!formulaVersion) {
      return NextResponse.json(
        { error: "Formula version not found." },
        { status: 404 }
      );
    }

    if (formulaVersion.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Only an active formula version can be used for production." },
        { status: 400 }
      );
    }

    const batch = await prisma.productionBatch.create({
      data: {
        batchNumber,
        productId,
        productVariantId,
        formulaId,
        formulaVersionId,
        plannedQuantity,
        plannedAt: body.plannedAt
          ? new Date(body.plannedAt)
          : new Date(),
        notes: body.notes
          ? String(body.notes).trim()
          : null,
        status: "PLANNED",
      },
      include: {
        product: true,
        productVariant: true,
        formula: true,
        formulaVersion: true,
      },
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (error) {
    console.error("Failed to create production batch:", error);

    return NextResponse.json(
      { error: "Failed to create production batch." },
      { status: 500 }
    );
  }
}