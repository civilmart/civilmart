import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: { select: { orders: true, invoices: true } },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            status: true,
            total: true,
          },
        },
        invoices: {
          orderBy: { invoiceDate: "desc" },
          take: 20,
          select: {
            id: true,
            invoiceNo: true,
            invoiceDate: true,
            totalAmount: true,
            paidAmount: true,
            paymentStatus: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        city: customer.city,
        address: customer.address,
        createdAt: customer.createdAt,
        orderCount: customer._count.orders,
        invoiceCount: customer._count.invoices,
        orders: customer.orders.map((order) => ({
          ...order,
          total: Number(order.total),
        })),
        invoices: customer.invoices.map((invoice) => ({
          ...invoice,
          totalAmount: Number(invoice.totalAmount),
          paidAmount: Number(invoice.paidAmount),
        })),
      },
    });
  } catch (error) {
    console.error("GET customer error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch customer" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await getSessionUserOrThrow();
    const { id } = await context.params;
    const body = await request.json();

    const customer = await prisma.customer.findUnique({ where: { id } });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name ?? "").trim();

      if (!name) {
        return NextResponse.json(
          { success: false, error: "Customer name is required" },
          { status: 400 }
        );
      }

      data.name = name;
    }

    if (body.phone !== undefined) {
      const phone = String(body.phone ?? "").trim();

      if (phone) {
        const existing = await prisma.customer.findFirst({
          where: { phone, NOT: { id } },
        });

        if (existing) {
          return NextResponse.json(
            { success: false, error: `Phone already exists: ${phone}` },
            { status: 409 }
          );
        }
      }

      data.phone = phone || null;
    }

    if (body.email !== undefined) {
      const email = String(body.email ?? "").trim();

      if (email) {
        const existing = await prisma.customer.findFirst({
          where: { email, NOT: { id } },
        });

        if (existing) {
          return NextResponse.json(
            { success: false, error: `Email already exists: ${email}` },
            { status: 409 }
          );
        }
      }

      data.email = email || null;
    }

    if (body.city !== undefined) {
      data.city = String(body.city ?? "").trim() || null;
    }

    if (body.address !== undefined) {
      data.address = String(body.address ?? "").trim() || null;
    }

    const updated = await prisma.customer.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
        city: updated.city,
        address: updated.address,
      },
    });
  } catch (error) {
    console.error("PATCH customer error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to update customer" },
      { status: 500 }
    );
  }
}