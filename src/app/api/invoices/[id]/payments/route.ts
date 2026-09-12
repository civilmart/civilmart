import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUserOrThrow();
    const { id } = await context.params;
    const body = await request.json();

    const amount = String(body.amount ?? "").trim();

    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: "Payment amount must be a positive number." },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found." },
        { status: 404 }
      );
    }

    if (invoice.paymentStatus === "CANCELLED") {
      return NextResponse.json(
        { success: false, error: "This invoice is voided and cannot accept payments." },
        { status: 400 }
      );
    }

    const total = Number(invoice.totalAmount);
    const paid = Number(invoice.paidAmount);
    const paying = Number(amount);
    const allowed = Math.max(0, Math.min(paying, total - paid));

    const method = String(body.method ?? (invoice.paymentMethod ?? "CASH")).trim();
    const reference = String(body.reference ?? "").trim();
    const notes = String(body.notes ?? "").trim();

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.invoicePayment.create({
        data: {
          invoiceId: invoice.id,
          amount: allowed,
          method: method || "CASH",
          reference: reference || null,
          notes: notes || null,
          createdById: user.id,
        },
      });

      const newPaid = paid + allowed;
      const paymentStatus =
        newPaid >= total ? "PAID" : newPaid > 0 ? "PARTIAL" : "UNPAID";

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { paidAmount: newPaid, paymentStatus },
      });

      return payment;
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...result,
          amount: Number(result.amount),
          paidAmount: paid + allowed,
          remaining: Math.max(0, total - (paid + allowed)),
          paymentStatus:
            paid + allowed >= total ? "PAID" : paid + allowed > 0 ? "PARTIAL" : "UNPAID",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST payment error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to record payment." },
      { status: 500 }
    );
  }
}