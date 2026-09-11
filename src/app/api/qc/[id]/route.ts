import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isQCCheckKey,
  isReadyForApproval,
  type QCCheckKey,
} from "@/lib/qc";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const detailInclude = {
  productionBatch: {
    include: {
      product: true,
      productVariant: true,
      formula: true,
      formulaVersion: {
        include: {
          ingredients: {
            include: {
              rawMaterial: true,
            },
          },
        },
      },
      materialConsumptions: {
        include: {
          rawMaterial: true,
          lot: {
            include: {
              supplier: true,
            },
          },
        },
      },
    },
  },
} as const;

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const record = await prisma.qualityControl.findUnique({
      where: { id },
      include: detailInclude,
    });

    if (!record) {
      return NextResponse.json(
        { error: "QC record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...record,
      readyForApproval: isReadyForApproval(record),
    });
  } catch (error) {
    console.error("Failed to load QC record:", error);

    return NextResponse.json(
      { error: "Failed to load QC record." },
      { status: 500 }
    );
  }
}

const allowedResults = ["PENDING", "PASS", "FAIL"] as const;
const allowedDecisions = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "ON_HOLD",
] as const;

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const existing = await prisma.qualityControl.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "QC record not found." },
        { status: 404 }
      );
    }

    if (existing.decision === "APPROVED" && existing.releasedAt) {
      return NextResponse.json(
        { error: "A released batch's QC record cannot be changed." },
        { status: 400 }
      );
    }

    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};

    // One of the five physical checks: body looks like
    // { check: "maturation", result: "PASS", value: "...", notes: "...", checkedBy: "..." }
    if (body.check !== undefined) {
      const check = String(body.check);

      if (!isQCCheckKey(check)) {
        return NextResponse.json(
          { error: "Unknown QC check." },
          { status: 400 }
        );
      }

      const key: QCCheckKey = check;

      if (body.result !== undefined) {
        const result = String(body.result);

        if (!allowedResults.includes(result as (typeof allowedResults)[number])) {
          return NextResponse.json(
            { error: "Invalid check result." },
            { status: 400 }
          );
        }

        data[`${key}Result`] = result;
        data[`${key}CheckedAt`] = result === "PENDING" ? null : now;
      }

      if (body.value !== undefined) {
        data[`${key}Value`] = body.value ? String(body.value).trim() : null;
      }

      if (body.notes !== undefined) {
        data[`${key}Notes`] = body.notes ? String(body.notes).trim() : null;
      }

      if (body.checkedBy !== undefined) {
        data[`${key}CheckedBy`] = body.checkedBy
          ? String(body.checkedBy).trim()
          : null;
      }
    }

    // Regulatory review
    if (body.regulatoryReviewResult !== undefined) {
      const result = String(body.regulatoryReviewResult);

      if (!allowedResults.includes(result as (typeof allowedResults)[number])) {
        return NextResponse.json(
          { error: "Invalid regulatory review result." },
          { status: 400 }
        );
      }

      data.regulatoryReviewResult = result;
      data.regulatoryReviewedAt = result === "PENDING" ? null : now;
    }

    if (body.regulatoryReviewNotes !== undefined) {
      data.regulatoryReviewNotes = body.regulatoryReviewNotes
        ? String(body.regulatoryReviewNotes).trim()
        : null;
    }

    if (body.regulatoryReviewedBy !== undefined) {
      data.regulatoryReviewedBy = body.regulatoryReviewedBy
        ? String(body.regulatoryReviewedBy).trim()
        : null;
    }

    // Overall decision
    if (body.decision !== undefined) {
      const decision = String(body.decision);

      if (
        !allowedDecisions.includes(
          decision as (typeof allowedDecisions)[number]
        )
      ) {
        return NextResponse.json(
          { error: "Invalid QC decision." },
          { status: 400 }
        );
      }

      if (decision === "APPROVED") {
        const merged = { ...existing, ...data };

        if (!isReadyForApproval(merged)) {
          return NextResponse.json(
            {
              error:
                "Cannot approve: every check and the regulatory review must pass first.",
            },
            { status: 409 }
          );
        }
      }

      data.decision = decision;
      data.decidedAt = decision === "PENDING" ? null : now;
    }

    if (body.decisionNotes !== undefined) {
      data.decisionNotes = body.decisionNotes
        ? String(body.decisionNotes).trim()
        : null;
    }

    if (body.decidedBy !== undefined) {
      data.decidedBy = body.decidedBy
        ? String(body.decidedBy).trim()
        : null;
    }

    const updated = await prisma.qualityControl.update({
      where: { id },
      data,
      include: detailInclude,
    });

    return NextResponse.json({
      ...updated,
      readyForApproval: isReadyForApproval(updated),
    });
  } catch (error) {
    console.error("Failed to update QC record:", error);

    return NextResponse.json(
      { error: "Failed to update QC record." },
      { status: 500 }
    );
  }
}
