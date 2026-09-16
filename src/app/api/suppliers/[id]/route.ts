import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const user = await getSessionUserOrThrow();
    if (!isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }
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

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: { select: { purchaseOrders: true, purchases: true } },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: "Supplier not found" },
        { status: 404 }
      );
    }

    if (supplier._count.purchaseOrders > 0 || supplier._count.purchases > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete supplier: it has purchase orders or purchases. Deactivate it instead.",
        },
        { status: 409 }
      );
    }

    await prisma.supplierProduct.deleteMany({ where: { supplierId: id } });
    await prisma.supplier.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete supplier:", error);

    return NextResponse.json(
      { success: false, error: "Failed to delete supplier" },
      { status: 500 }
    );
  }
}