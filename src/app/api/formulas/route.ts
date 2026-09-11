import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type UnitType = "WEIGHT" | "VOLUME" | "PIECE";

type InventoryUnit =
  | "G"
  | "KG"
  | "ML"
  | "L"
  | "PIECE";

type PreparedIngredient = {
  rawMaterialId: string;
  quantity: number;
  unitType: UnitType;
  unit: InventoryUnit;
  percentage: number | null;
  notes: string | null;
};

function isValidUnit(
  unitType: UnitType,
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

export async function GET() {
  try {
    const formulas = await prisma.formula.findMany({
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(formulas);
  } catch (error) {
    console.error("GET formulas error:", error);

    return NextResponse.json(
      { error: "Failed to fetch formulas" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const {
      productId,
      code,
      name,
      description,
      version,
      ingredients,
      notes,
      batchSize: rawBatchSize,
      batchUnit: rawBatchUnit,
    } = body;

    if (!productId) {
      return NextResponse.json(
        { error: "Product is required" },
        { status: 400 }
      );
    }

    if (!code?.trim()) {
      return NextResponse.json(
        { error: "Formula code is required" },
        { status: 400 }
      );
    }

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Formula name is required" },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(ingredients) ||
      ingredients.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "At least one formula ingredient is required",
        },
        { status: 400 }
      );
    }

    const formulaVersion =
      version === undefined ||
      version === null ||
      version === ""
        ? 1
        : Number(version);

    if (
      !Number.isInteger(formulaVersion) ||
      formulaVersion <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Formula version must be a positive integer",
        },
        { status: 400 }
      );
    }

    // Standard production batch size.
    // Default keeps backward compatibility with existing formula behavior.
    const batchSize =
      rawBatchSize === undefined ||
      rawBatchSize === null ||
      rawBatchSize === ""
        ? 1000
        : Number(rawBatchSize);

    if (
      !Number.isFinite(batchSize) ||
      batchSize <= 0
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
      rawBatchUnit === undefined ||
      rawBatchUnit === null ||
      rawBatchUnit === ""
        ? "ML"
        : String(rawBatchUnit).toUpperCase();

    if (!isValidInventoryUnit(batchUnitValue)) {
      return NextResponse.json(
        {
          error:
            "Invalid batch unit. Use G, KG, ML, L, or PIECE.",
        },
        { status: 400 }
      );
    }

    const product =
      await prisma.product.findUnique({
        where: {
          id: productId,
        },
      });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const existingFormula =
      await prisma.formula.findUnique({
        where: {
          code: code.trim(),
        },
      });

    if (existingFormula) {
      return NextResponse.json(
        {
          error:
            "Formula code already exists",
        },
        { status: 409 }
      );
    }

    const preparedIngredients: PreparedIngredient[] =
      [];

    let percentageTotal = 0;

    for (const ingredient of ingredients) {
      if (!ingredient.rawMaterialId) {
        return NextResponse.json(
          {
            error:
              "Each ingredient requires a raw material",
          },
          { status: 400 }
        );
      }

      const quantity = Number(
        ingredient.quantity
      );

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Each ingredient must have a quantity greater than zero",
          },
          { status: 400 }
        );
      }

      const rawMaterial =
        await prisma.rawMaterial.findUnique({
          where: {
            id: ingredient.rawMaterialId,
          },
        });

      if (!rawMaterial) {
        return NextResponse.json(
          {
            error:
              "Raw material not found",
          },
          { status: 404 }
        );
      }

      const unit = String(
        ingredient.unit
      ).toUpperCase();

      if (
        !isValidUnit(
          rawMaterial.unitType,
          unit
        )
      ) {
        return NextResponse.json(
          {
            error: `Invalid unit ${unit} for ${rawMaterial.name}`,
          },
          { status: 400 }
        );
      }

      let percentage:
        | number
        | null = null;

      if (
        ingredient.percentage !==
          undefined &&
        ingredient.percentage !==
          null &&
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
          return NextResponse.json(
            {
              error: `Invalid percentage for ${rawMaterial.name}`,
            },
            { status: 400 }
          );
        }

        percentageTotal += percentage;
      }

      preparedIngredients.push({
        rawMaterialId:
          ingredient.rawMaterialId,
        quantity,
        unitType:
          rawMaterial.unitType,
        unit:
          unit as InventoryUnit,
        percentage,
        notes:
          ingredient.notes?.trim() ||
          null,
      });
    }

    if (
      percentageTotal > 0 &&
      Math.abs(
        percentageTotal - 100
      ) > 0.01
    ) {
      return NextResponse.json(
        {
          error: `Ingredient percentages must total 100%. Current total: ${percentageTotal.toFixed(
            4
          )}%`,
        },
        { status: 400 }
      );
    }

    const formula =
      await prisma.formula.create({
        data: {
          productId,
          code: code.trim(),
          name: name.trim(),
          description:
            description?.trim() ||
            null,
          status: "DRAFT",

          versions: {
            create: {
              version:
                formulaVersion,
              status: "DRAFT",
              notes:
                notes?.trim() ||
                null,

              batchSize,
              batchUnit:
                batchUnitValue,

              ingredients: {
                create:
                  preparedIngredients,
              },
            },
          },
        },
        include: {
          product: true,
          versions: {
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
      formula,
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST formula error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to create formula",
      },
      { status: 500 }
    );
  }
}