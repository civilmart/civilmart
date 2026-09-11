import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOutstandingItems, isReadyForApproval } from "@/lib/qc";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// ============================================================
// FINAL BATCH RELEASE
//
// This is the only place a batch is ever allowed to move to
// RELEASED. It requires the QC decision to already be APPROVED
// (which itself required every check + the regulatory review to
// pass — see the PATCH route). Releasing stamps both the QC
// record (releasedBy/releasedAt) and the batch itself
// (status + releasedAt), so either can be queried directly.
// ============================================================

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const record = await prisma.qualityControl.findUnique({
      where: { id },
      include: { productionBatch: true },
    });

    if (!record) {
      return NextResponse.json(
        { error: "QC record not found." },
        { status: 404 }
      );
    }

    if (record.releasedAt) {
      return NextResponse.json(
        { error: "This batch has already been released." },
        { status: 400 }
      );
    }

    if (record.decision !== "APPROVED" || !isReadyForApproval(record)) {
      return NextResponse.json(
        {
          error:
            "The batch cannot be released until QC approves it — every check and the regulatory review must pass first.",
          outstanding: getOutstandingItems(record),
        },
        { status: 409 }
      );
    }

    const now = new Date();
    const releasedBy = body.releasedBy
      ? String(body.releasedBy).trim()
      : null;

    const [updatedQC, updatedBatch] = await prisma.$transaction([
      prisma.qualityControl.update({
        where: { id },
        data: {
          releasedAt: now,
          releasedBy,
        },
      }),
      prisma.productionBatch.update({
        where: { id: record.productionBatchId },
        data: {
          status: "RELEASED",
          releasedAt: now,
        },
      }),
    ]);

    return NextResponse.json({
      qualityControl: updatedQC,
      productionBatch: updatedBatch,
    });
  } catch (error) {
    console.error("Failed to release batch:", error);

    return NextResponse.json(
      { error: "Failed to release batch." },
      { status: 500 }
    );
  }
}
