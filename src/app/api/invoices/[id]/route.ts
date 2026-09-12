import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const invoiceInclude = {
  customer: { select: { id: true, name: true, phone: true, city: true, address: true } },
  items: {
    include: {
      product: { select: { id: true, code: true, name: true } },
      variant: { select: { id: true, sku: true, name: true } },
    },
  },
  payments: { orderBy: { paidAt: "asc" } },
  createdBy: { select: { id: true, name: true, username: true } },
  order: { select: { id: true, orderNumber: true } },
} as const;

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: invoiceInclude,
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...invoice,
        subtotal: Number(invoice.subtotal),
        tax: Number(invoice.tax),
        discount: Number(invoice.discount),
        totalAmount: Number(invoice.totalAmount),
        paidAmount: Number(invoice.paidAmount),
        items: invoice.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
        payments: invoice.payments.map((payment) => ({
          ...payment,
          amount: Number(payment.amount),
        })),
      },
    });
  } catch (error) {
    console.error("GET invoice error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUserOrThrow();
    const { id } = await context.params;
    const body = await request.json();

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Void: cancel an unpaid invoice and return stock.
    if (body.void === true) {
      if (invoice.payments.length > 0 || Number(invoice.paidAmount) > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "This invoice has payments and cannot be voided.",
          },
          { status: 400 }
        );
      }

      if (invoice.paymentStatus === "CANCELLED") {
        return NextResponse.json(
          { success: false, error: "Invoice is already voided." },
          { status: 400 }
        );
      }

      const voided = await prisma.$transaction(async (tx) => {
        const updated = await tx.invoice.update({
          where: { id },
          data: {
            paymentStatus: "CANCELLED",
            notes: [invoice.notes, "Voided"].filter(Boolean).join(" · "),
          },
        });

        for (const item of invoice.items) {
          if (!item.productId) continue;

          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stockQuantity: true },
          });

          if (!product) continue;

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: String(
                Number(product.stockQuantity) + Number(item.quantity)
              ),
            },
          });

          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              variantId: item.variantId,
              transactionType: "SALE_RETURN",
              quantity: Number(item.quantity),
              unit: item.unit,
              referenceType: "INVOICE",
              referenceId: invoice.id,
              notes: `Void ${invoice.invoiceNo}`,
              createdById: user.id,
            },
          });
        }

        return updated;
      });

      return NextResponse.json({ success: true, data: voided });
    }

    const data: Record<string, unknown> = {};

    if (body.notes !== undefined) {
      data.notes = String(body.notes ?? "").trim() || null;
    }

    if (body.paymentMethod !== undefined) {
      data.paymentMethod = String(body.paymentMethod ?? "").trim() || null;
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data,
      include: invoiceInclude,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        subtotal: Number(updated.subtotal),
        tax: Number(updated.tax),
        discount: Number(updated.discount),
        totalAmount: Number(updated.totalAmount),
        paidAmount: Number(updated.paidAmount),
      },
    });
  } catch (error) {
    console.error("PATCH invoice error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}