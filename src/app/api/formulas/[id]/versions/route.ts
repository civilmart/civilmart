import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const versionId = String(body.versionId ?? "").trim();
    const status = String(body.status ?? "").trim();

    if (!versionId) {
      return NextResponse.json(
        { error: "versionId is required." },
        { status: 400 }
      );
    }

    if (status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Only ACTIVE status is supported for version activation." },
        { status: 400 }
      );
    }

    const formula = await prisma.formula.findUnique({
      where: { id },
      include: {
        versions: true,
      },
    });

    if (!formula) {
      return NextResponse.json(
        { error: "Formula not found." },
        { status: 404 }
      );
    }

    const version = formula.versions.find(
      (item) => item.id === versionId
    );

    if (!version) {
      return NextResponse.json(
        { error: "Formula version not found." },
        { status: 404 }
      );
    }

    const updatedFormula = await prisma.$transaction(
      async (tx) => {
        // Archive all other versions.
        await tx.formulaVersion.updateMany({
          where: {
            formulaId: id,
            id: {
              not: versionId,
            },
          },
          data: {
            status: "ARCHIVED",
          },
        });

        // Activate the selected existing version.
        await tx.formulaVersion.update({
          where: {
            id: versionId,
          },
          data: {
            status: "ACTIVE",
          },
        });

        // Make the formula itself active.
        return tx.formula.update({
          where: {
            id,
          },
          data: {
            status: "ACTIVE",
          },
          include: {
            product: {
              include: {
                variants: true,
              },
            },
            versions: {
              orderBy: {
                version: "desc",
              },
              include: {
                ingredients: {
                  include: {
                    rawMaterial: true,
                  },
                },
              },
            },
          },
        });
      },
      {
        maxWait: 30000,
        timeout: 30000,
      }
    );

    return NextResponse.json(updatedFormula);
  } catch (error) {
    console.error("Activate formula version error:", error);

    return NextResponse.json(
      { error: "Failed to activate formula version." },
      { status: 500 }
    );
  }
}