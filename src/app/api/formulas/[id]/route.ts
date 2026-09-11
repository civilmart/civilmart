import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type InventoryUnit =
  | "G"
  | "KG"
  | "ML"
  | "L"
  | "PIECE";

type PreparedIngredient = {
  rawMaterialId: string;
  quantity: number;
  unitType: "WEIGHT" | "VOLUME" | "PIECE";
  unit: InventoryUnit;
  percentage: number | null;
  notes: string | null;
};

function isValidUnit(
  unitType: "WEIGHT" | "VOLUME" | "PIECE",
  unit: string
) {
  if (unitType === "WEIGHT") {
    return unit === "G" || unit === "KG";
  }

  if (unitType === "VOLUME") {
    return unit === "ML" || unit === "L";
  }

  return unit === "PIECE";
}

function isValidInventoryUnit(
  unit: string
): unit is InventoryUnit {
  return (
    unit === "G" ||
    unit === "KG" ||
    unit === "ML" ||
    unit === "L" ||
    unit === "PIECE"
  );
}

async function prepareIngredients(items: unknown) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one ingredient is required");
  }

  const prepared: PreparedIngredient[] = [];

  let percentageTotal = 0;
  let hasPercentage = false;

  for (const item of items) {
    if (!item || typeof item !== "object") {
      throw new Error("Invalid ingredient");
    }

    const ingredient = item as Record<string, unknown>;

    const rawMaterialId = String(
      ingredient.rawMaterialId ?? ""
    ).trim();

    if (!rawMaterialId) {
      throw new Error(
        "Each ingredient requires a raw material"
      );
    }

    const quantity = Number(
      ingredient.quantity
    );

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      throw new Error(
        "Each ingredient must have a valid quantity greater than zero"
      );
    }

    const rawMaterial =
      await prisma.rawMaterial.findUnique({
        where: {
          id: rawMaterialId,
        },
      });

    if (!rawMaterial) {
      throw new Error(
        "Raw material not found"
      );
    }

    const unit = String(
      ingredient.unit ?? ""
    ).toUpperCase();

    if (
      !isValidUnit(
        rawMaterial.unitType,
        unit
      )
    ) {
      throw new Error(
        `Invalid unit ${unit} for ${rawMaterial.name}`
      );
    }

    let percentage:
      | number
      | null = null;

    if (
      ingredient.percentage !== undefined &&
      ingredient.percentage !== null &&
      ingredient.percentage !== ""
    ) {
      percentage = Number(
        ingredient.percentage
      );

      if (
        !Number.isFinite(
          percentage
        ) ||
        percentage < 0 ||
        percentage > 100
      ) {
        throw new Error(
          `Invalid percentage for ${rawMaterial.name}`
        );
      }

      hasPercentage = true;
      percentageTotal += percentage;
    }

    prepared.push({
      rawMaterialId,
      quantity,
      unitType:
        rawMaterial.unitType,
      unit:
        unit as PreparedIngredient["unit"],
      percentage,
      notes:
        typeof ingredient.notes ===
          "string" &&
        ingredient.notes.trim()
          ? ingredient.notes.trim()
          : null,
    });
  }

  if (
    hasPercentage &&
    Math.abs(
      percentageTotal - 100
    ) > 0.01
  ) {
    throw new Error(
      `Ingredient percentages must total 100%. Current total: ${percentageTotal.toFixed(
        2
      )}%`
    );
  }

  return prepared;
}

async function getFormula(id: string) {
  return prisma.formula.findUnique({
    where: { id },
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
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const formula = await getFormula(id);

    if (!formula) {
      return NextResponse.json(
        { error: "Formula not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(formula);
  } catch (error) {
    console.error(
      "GET formula error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch formula",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const existingFormula =
      await prisma.formula.findUnique({
        where: { id },
        include: {
          versions: {
            orderBy: {
              version: "desc",
            },
          },
        },
      });

    if (!existingFormula) {
      return NextResponse.json(
        {
          error:
            "Formula not found",
        },
        { status: 404 }
      );
    }

    const name =
      body.name !== undefined
        ? String(body.name).trim()
        : existingFormula.name;

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Formula name is required",
        },
        { status: 400 }
      );
    }

    const description =
      body.description !== undefined
        ? String(body.description).trim() ||
          null
        : existingFormula.description;

    const requestedStatus =
      body.status !== undefined
        ? String(body.status)
        : existingFormula.status;

    if (
      ![
        "DRAFT",
        "ACTIVE",
        "ARCHIVED",
      ].includes(requestedStatus)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid formula status",
        },
        { status: 400 }
      );
    }

    const createNewVersion =
      Boolean(body.createNewVersion);

    // Simple metadata/status update.
    if (!createNewVersion) {
      const updatedFormula =
        await prisma.formula.update({
          where: { id },
          data: {
            name,
            description,
            status:
              requestedStatus as
                | "DRAFT"
                | "ACTIVE"
                | "ARCHIVED",
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

      return NextResponse.json(
        updatedFormula
      );
    }

    // Editing ingredients creates a NEW version.
    const requestedVersion = Number(
      body.version ??
        ((existingFormula
          .versions[0]?.version ?? 0) +
          1)
    );

    if (
      !Number.isInteger(
        requestedVersion
      ) ||
      requestedVersion <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Version must be a positive integer",
        },
        { status: 400 }
      );
    }

    const versionExists =
      existingFormula.versions.some(
        (version) =>
          version.version ===
          requestedVersion
      );

    if (versionExists) {
      return NextResponse.json(
        {
          error: `Version ${requestedVersion} already exists`,
        },
        { status: 409 }
      );
    }

    let preparedIngredients:
      | PreparedIngredient[];

    try {
      preparedIngredients =
        await prepareIngredients(
          body.ingredients
        );
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid ingredients",
        },
        { status: 400 }
      );
    }

    // Batch size/unit for the new formula version.
    // If omitted, inherit the latest version.
    const latestVersion =
      existingFormula.versions[0];

    const rawBatchSize =
      body.batchSize !== undefined &&
      body.batchSize !== null &&
      body.batchSize !== ""
        ? Number(body.batchSize)
        : Number(
            latestVersion?.batchSize ??
              1000
          );

    if (
      !Number.isFinite(
        rawBatchSize
      ) ||
      rawBatchSize <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Batch size must be greater than zero",
        },
        { status: 400 }
      );
    }

    const batchUnitValue =
      body.batchUnit !== undefined &&
      body.batchUnit !== null &&
      body.batchUnit !== ""
        ? String(
            body.batchUnit
          ).toUpperCase()
        : String(
            latestVersion?.batchUnit ??
              "ML"
          );

    if (
      !isValidInventoryUnit(
        batchUnitValue
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid batch unit. Use G, KG, ML, L, or PIECE.",
        },
        { status: 400 }
      );
    }

    const versionStatus =
      requestedStatus === "ACTIVE"
        ? "ACTIVE"
        : "DRAFT";

    const versionNotes =
      body.versionNotes !==
      undefined
        ? String(
            body.versionNotes
          ).trim() || null
        : null;

    const updatedFormula =
      await prisma.$transaction(
        async (tx) => {
          if (
            requestedStatus ===
            "ACTIVE"
          ) {
            await tx.formulaVersion.updateMany(
              {
                where: {
                  formulaId: id,
                },
                data: {
                  status: "ARCHIVED",
                },
              }
            );
          }

          await tx.formula.update({
            where: { id },
            data: {
              name,
              description,
              status:
                requestedStatus as
                  | "DRAFT"
                  | "ACTIVE"
                  | "ARCHIVED",
            },
          });

          await tx.formulaVersion.create(
            {
              data: {
                formulaId: id,
                version:
                  requestedVersion,
                status:
                  versionStatus,
                notes:
                  versionNotes,

                batchSize:
                  rawBatchSize,
                batchUnit:
                  batchUnitValue,

                ingredients: {
                  create:
                    preparedIngredients,
                },
              },
            }
          );

          return tx.formula.findUnique(
            {
              where: { id },
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
                        rawMaterial:
                          true,
                      },
                    },
                  },
                },
              },
            }
          );
        },
        {
          maxWait: 30000,
          timeout: 30000,
        }
      );

    return NextResponse.json(
      updatedFormula
    );
  } catch (error) {
    console.error(
      "PATCH formula error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to update formula",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const formula =
      await prisma.formula.findUnique({
        where: { id },
        include: {
          versions: true,
        },
      });

    if (!formula) {
      return NextResponse.json(
        {
          error:
            "Formula not found",
        },
        { status: 404 }
      );
    }

    // For safety, only completely unused draft formulas
    // can be deleted.
    if (
      formula.status !==
      "DRAFT"
    ) {
      return NextResponse.json(
        {
          error:
            "Only DRAFT formulas can be deleted. Archive active formulas instead.",
        },
        { status: 409 }
      );
    }

    await prisma.formula.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message:
        "Formula deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE formula error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete formula",
      },
      { status: 500 }
    );
  }
}