import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rawMaterials = await prisma.rawMaterial.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: rawMaterials,
    });
  } catch (error) {
    console.error("Failed to fetch raw materials:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch raw materials",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      code,
      name,
      materialType,
      unitType,
      density,
      densityUnit,
      minimumStock,
      reorderLevel,
      notes,
    } = body;

    if (!code || !name || !materialType || !unitType) {
      return NextResponse.json(
        {
          success: false,
          error: "Code, name, material type, and unit type are required",
        },
        { status: 400 }
      );
    }

    const rawMaterial = await prisma.rawMaterial.create({
      data: {
        code,
        name,
        materialType,
        unitType,
        density: density || null,
        densityUnit: densityUnit || null,
        minimumStock: minimumStock || null,
        reorderLevel: reorderLevel || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: rawMaterial,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create raw material:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create raw material",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const {
      id,
      code,
      name,
      materialType,
      unitType,
      density,
      densityUnit,
      minimumStock,
      reorderLevel,
      notes,
      isActive,
    } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Raw material ID is required",
        },
        { status: 400 }
      );
    }

    const rawMaterial = await prisma.rawMaterial.update({
      where: {
        id,
      },
      data: {
        code,
        name,
        materialType,
        unitType,
        density: density !== undefined && density !== null && density !== ""
          ? Number(density)
          : null,
        densityUnit: densityUnit || null,
        minimumStock:
          minimumStock !== undefined &&
          minimumStock !== null &&
          minimumStock !== ""
            ? Number(minimumStock)
            : null,
        reorderLevel:
          reorderLevel !== undefined &&
          reorderLevel !== null &&
          reorderLevel !== ""
            ? Number(reorderLevel)
            : null,
        notes: notes || null,
        isActive:
          typeof isActive === "boolean" ? isActive : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: rawMaterial,
    });
  } catch (error) {
    console.error("Failed to update raw material:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update raw material",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Raw material ID is required",
        },
        { status: 400 }
      );
    }

    const rawMaterial = await prisma.rawMaterial.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: rawMaterial,
    });
  } catch (error) {
    console.error("Failed to deactivate raw material:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to deactivate raw material",
      },
      { status: 500 }
    );
  }
}