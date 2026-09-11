import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const {
      name,
      contactName,
      phone,
      email,
      address,
      notes,
      isActive,
    } = body;

    if (name !== undefined && !name?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Supplier name cannot be empty",
        },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.update({
      where: {
        id,
      },
      data: {
        ...(name !== undefined && {
          name: name.trim(),
        }),
        ...(contactName !== undefined && {
          contactName: contactName?.trim() || null,
        }),
        ...(phone !== undefined && {
          phone: phone?.trim() || null,
        }),
        ...(email !== undefined && {
          email: email?.trim() || null,
        }),
        ...(address !== undefined && {
          address: address?.trim() || null,
        }),
        ...(notes !== undefined && {
          notes: notes?.trim() || null,
        }),
        ...(isActive !== undefined && {
          isActive: Boolean(isActive),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    console.error("Failed to update supplier:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update supplier",
      },
      { status: 500 }
    );
  }
}