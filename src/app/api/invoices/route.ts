import { NextRequest, NextResponse } from "next/server";
import { ProductUnit } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q");
    const status = url.searchParams.get("status");

    const invoices = await prisma.invoice.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { invoiceNo: { contains: q, mode: "insensitive" } },
                { customer: { name: { contains: q, mode: "insensitive" } } },
                { customer: { phone: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
        ...(status ? { paymentStatus: status as never } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: {
          include: {
            product: { select: { id: true, code: true, name: true } },
            variant: { select: { id: true, sku: true, name: true } },
          },
        },
        payments: { orderBy: { paidAt: "asc" } },
      },
      orderBy: { invoiceDate: "desc" },
    });

    return NextResponse.json({ success: true, data: invoices });
  } catch (error) {
    console.error("GET invoices error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

type InvoiceItemInput = {
  productId: string;
  variantId?: string | null;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  description?: string;
  sku?: string;
};

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUserOrThrow();
    const body = await request.json();

    const {
      customerId,
      items,
      dueDate,
      tax = 0,
      discount = 0,
      paymentMethod,
      notes,
      markPaid = false,
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one item is required" },
        { status: 400 }
      );
    }

    const numericTax = Number(tax) || 0;
    const numericDiscount = Number(discount) || 0;

    if (numericTax < 0 || numericDiscount < 0) {
      return NextResponse.json(
        { success: false, error: "Tax and discount cannot be negative" },
        { status: 400 }
      );
    }

    type PreparedItem = {
      productId: string;
      variantId: string | null;
      product: { id: string; code: string; name: string; unit: ProductUnit; stockQuantity: unknown };
      variant: { id: string; sku: string; name: string } | null;
      description: string;
      sku: string | null;
      quantity: number;
      unit: ProductUnit;
      unitPrice: number;
    };

    const preparedItems: PreparedItem[] = [];
    const productIds = Array.from(
      new Set(items.map((i: InvoiceItemInput) => i.productId))
    );

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { variants: true },
    });
    const productsById = new Map(products.map((p) => [p.id, p]));

    for (const item of items as InvoiceItemInput[]) {
      const product = productsById.get(item.productId);

      if (!product) {
        return NextResponse.json(
          { success: false, error: `Product not found: ${item.productId}` },
          { status: 404 }
        );
      }

      let variant = null;

      if (item.variantId) {
        variant =
          product.variants.find((v) => v.id === item.variantId) ?? null;

        if (!variant) {
          return NextResponse.json(
            { success: false, error: "Variant not found for this product" },
            { status: 400 }
          );
        }
      }

      const quantity = Number(item.quantity);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json(
          { success: false, error: `Invalid quantity for ${product.name}` },
          { status: 400 }
        );
      }

      const unit = (item.unit ?? product.unit) as ProductUnit;

      const fallback =
        variant?.price !== null && variant?.price !== undefined
          ? Number(variant.price)
          : product.price !== null && product.price !== undefined
            ? Number(product.price)
            : null;

      const unitPrice =
        item.unitPrice !== undefined ? Number(item.unitPrice) : fallback;

      if (unitPrice === null || !Number.isFinite(unitPrice) || unitPrice < 0) {
        return NextResponse.json(
          { success: false, error: `No price available for ${product.name}` },
          { status: 400 }
        );
      }

      preparedItems.push({
        productId: product.id,
        variantId: variant?.id ?? null,
        product,
        variant,
        description: (item.description ?? product.name).trim(),
        sku: (item.sku ?? variant?.sku ?? product.code).trim() || null,
        quantity,
        unit,
        unitPrice,
      });
    }

    const subtotal = preparedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const totalAmount = subtotal + numericTax - numericDiscount;

    if (totalAmount < 0) {
      return NextResponse.json(
        { success: false, error: "Invoice total cannot be negative" },
        { status: 400 }
      );
    }

    let invoiceNo = "";
    let created:
      | {
          id: string;
          invoiceNo: string;
          invoiceDate: Date;
          dueDate: Date | null;
          subtotal: unknown;
          tax: unknown;
          discount: unknown;
          totalAmount: unknown;
          paidAmount: unknown;
          paymentStatus: string;
          notes: string | null;
        }
      | null = null;

    for (let attempt = 0; attempt < 6; attempt++) {
      invoiceNo = `INV-${Date.now()}-${attempt}`;

      try {
        created = await prisma.$transaction(async (tx) => {
          const invoice = await tx.invoice.create({
            data: {
              invoiceNo,
              customerId: customerId || null,
              createdById: user.id,
              invoiceDate: new Date(),
              dueDate: dueDate ? new Date(dueDate) : null,
              subtotal,
              tax: numericTax,
              discount: numericDiscount,
              totalAmount,
              paidAmount: markPaid ? totalAmount : 0,
              paymentStatus: markPaid ? "PAID" : "UNPAID",
              paymentMethod: paymentMethod || null,
              notes: notes?.trim() || null,
              items: {
                create: preparedItems.map((item) => ({
                  productId: item.productId,
                  variantId: item.variantId,
                  description: item.description,
                  sku: item.sku,
                  quantity: item.quantity,
                  unit: item.unit,
                  unitPrice: item.unitPrice,
                  totalPrice: item.quantity * item.unitPrice,
                })),
              },
            },
            include: { customer: true, items: true, payments: true },
          });

          for (const item of preparedItems) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: String(
                  Number(item.product.stockQuantity) - item.quantity
                ),
              },
            });

            await tx.inventoryTransaction.create({
              data: {
                productId: item.productId,
                variantId: item.variantId,
                transactionType: "SALE",
                quantity: item.quantity,
                unit: item.unit,
                referenceType: "INVOICE",
                referenceId: invoice.id,
                notes: `Invoice ${invoiceNo}`,
                createdById: user.id,
              },
            });
          }

          return invoice;
        });

        break;
      } catch (error) {
        const isUnique = String(error).toLowerCase().includes("unique");

        if (isUnique && attempt < 5) {
          continue;
        }

        throw error;
      }
    }

    if (!created) {
      throw new Error("Failed to create invoice");
    }

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("POST invoice error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}