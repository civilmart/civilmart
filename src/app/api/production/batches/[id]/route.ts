import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateBatchRequirements } from "@/lib/production";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const allowedStatuses = [
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

type BatchStatus = (typeof allowedStatuses)[number];

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const status = String(body.status ?? "").trim() as BatchStatus;

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          error:
            "Invalid status. Use PLANNED, IN_PROGRESS, COMPLETED, or CANCELLED.",
        },
        { status: 400 }
      );
    }

    const batch = await prisma.productionBatch.findUnique({
      where: {
        id,
      },
    });

    if (!batch) {
      return NextResponse.json(
        { error: "Production batch not found." },
        { status: 404 }
      );
    }

    if (batch.status === "CANCELLED") {
      return NextResponse.json(
        { error: "A cancelled batch cannot be changed." },
        { status: 400 }
      );
    }

    if (batch.status === "COMPLETED") {
      return NextResponse.json(
        { error: "A completed batch cannot be changed." },
        { status: 400 }
      );
    }

    const now = new Date();

    const data: {
      status: BatchStatus;
      startedAt?: Date;
      completedAt?: Date;
    } = {
      status,
    };

    if (status === "IN_PROGRESS" && !batch.startedAt) {
      data.startedAt = now;
    }

    if (status === "COMPLETED") {
      data.completedAt = now;

      if (body.producedQuantity !== undefined) {
        const producedQuantity = Number(body.producedQuantity);

        if (
          !Number.isFinite(producedQuantity) ||
          producedQuantity <= 0
        ) {
          return NextResponse.json(
            { error: "Produced quantity must be greater than zero." },
            { status: 400 }
          );
        }
      }
    }

    if (body.producedQuantity !== undefined) {
      const producedQuantity = Number(body.producedQuantity);

      if (
        !Number.isFinite(producedQuantity) ||
        producedQuantity <= 0
      ) {
        return NextResponse.json(
          { error: "Produced quantity must be greater than zero." },
          { status: 400 }
        );
      }

      data.status = status;
    }

    const updatedBatch = await prisma.productionBatch.update({
      where: {
        id,
      },
      data: {
        ...data,
        ...(body.producedQuantity !== undefined
          ? {
              producedQuantity: Number(body.producedQuantity),
            }
          : {}),
        ...(body.notes !== undefined
          ? {
              notes: body.notes
                ? String(body.notes).trim()
                : null,
            }
          : {}),
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

    return NextResponse.json(updatedBatch);
  } catch (error) {
    console.error("Failed to update production batch:", error);

    return NextResponse.json(
      { error: "Failed to update production batch." },
      { status: 500 }
    );
  }
}