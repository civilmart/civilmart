import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const REPORT_TYPES = ["purchases", "vendors", "stock", "sales", "invoices"] as const;

type ReportType = (typeof REPORT_TYPES)[number];

async function getPurchasesReport() {
  const purchases = await prisma.purchase.findMany({
    include: {
      supplier: { select: { name: true } },
      items: { select: { id: true } },
    },
    orderBy: { purchaseDate: "desc" },
  });

  const totalSpend = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);

  return {
    columns: [
      "Purchase No",
      "Date",
      "Supplier",
      "Items",
      "Subtotal",
      "Tax",
      "Discount",
      "Total",
    ],
    rows: purchases.map((p) => [
      p.purchaseNo,
      p.purchaseDate.toISOString().split("T")[0],
      p.supplier?.name ?? "",
      String(p.items.length),
      Number(p.subtotal).toFixed(2),
      Number(p.tax).toFixed(2),
      Number(p.discount).toFixed(2),
      Number(p.totalAmount).toFixed(2),
    ]),
    summary: { count: purchases.length, totalSpend },
  };
}

async function getVendorsReport() {
  const suppliers = await prisma.supplier.findMany({
    include: {
      purchases: {
        where: { status: { not: "CANCELLED" } },
        select: { id: true, totalAmount: true, purchaseDate: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return {
    columns: [
      "Supplier",
      "Contact",
      "Phone",
      "Purchases",
      "Total Spend",
      "Avg Order Value",
      "Last Purchase Date",
    ],
    rows: suppliers.map((supplier) => {
      const purchases = supplier.purchases;
      const totalSpend = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
      const lastOrder =
        purchases.length > 0
          ? purchases.sort(
              (a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime()
            )[0]
          : null;

      return [
        supplier.name,
        supplier.contactName ?? "",
        supplier.phone ?? "",
        String(purchases.length),
        totalSpend.toFixed(2),
        purchases.length > 0 ? (totalSpend / purchases.length).toFixed(2) : "0.00",
        lastOrder ? lastOrder.purchaseDate.toISOString().split("T")[0] : "",
      ];
    }),
    summary: { count: suppliers.length },
  };
}

async function getStockReport() {
  const products = await prisma.product.findMany({
    include: { category: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  let totalValue = 0;

  const rows = products.map((product) => {
    const stock = Number(product.stockQuantity);

    return [
      product.code,
      product.name,
      product.category?.name ?? "",
      product.unit,
      stock.toFixed(2),
      stock <= 0 ? "OUT_OF_STOCK" : "IN_STOCK",
      "",
      "",
      product.status,
    ];
  });

  return {
    columns: [
      "Code",
      "Product",
      "Category",
      "Unit",
      "Current Stock",
      "Stock Status",
      "Price",
      "Stock Value",
      "Status",
    ],
    rows,
    summary: { count: products.length, totalValue },
  };
}

async function getSalesReport() {
  const orders = await prisma.customerOrder.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  const revenue = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + Number(o.total), 0);

  return {
    columns: [
      "Order No",
      "Customer",
      "Phone",
      "Date",
      "Items",
      "Subtotal",
      "Shipping",
      "Total",
      "Status",
    ],
    rows: orders.map((o) => [
      o.orderNumber,
      o.customerName,
      o.phone,
      o.createdAt.toISOString(),
      String(o.items.length),
      Number(o.subtotal).toFixed(2),
      Number(o.shipping).toFixed(2),
      Number(o.total).toFixed(2),
      o.status,
    ]),
    summary: { count: orders.length, revenue },
  };
}

async function getInvoicesReport() {
  const invoices = await prisma.invoice.findMany({
    include: { customer: { select: { name: true } } },
    orderBy: { invoiceDate: "desc" },
  });

  const paid = invoices.reduce((sum, i) => sum + Number(i.paidAmount), 0);
  const invoiced = invoices.reduce((sum, i) => sum + Number(i.totalAmount), 0);
  const outstanding = invoiced - paid;

  return {
    columns: ["Invoice No", "Customer", "Date", "Due Date", "Total", "Paid", "Balance", "Status"],
    rows: invoices.map((i) => [
      i.invoiceNo,
      i.customer?.name ?? "",
      i.invoiceDate.toISOString().split("T")[0],
      i.dueDate ? i.dueDate.toISOString().split("T")[0] : "",
      Number(i.totalAmount).toFixed(2),
      Number(i.paidAmount).toFixed(2),
      (Number(i.totalAmount) - Number(i.paidAmount)).toFixed(2),
      i.paymentStatus,
    ]),
    summary: { count: invoices.length, invoiced, paid, outstanding },
  };
}

const handlers: Record<ReportType, () => Promise<unknown>> = {
  purchases: getPurchasesReport,
  vendors: getVendorsReport,
  stock: getStockReport,
  sales: getSalesReport,
  invoices: getInvoicesReport,
};

export async function GET(_request: NextRequest, context: { params: Promise<{ type: string }> }) {
  try {
    const { type } = await context.params;

    if (!REPORT_TYPES.includes(type as ReportType)) {
      return NextResponse.json(
        { success: false, error: "Unknown report type" },
        { status: 404 }
      );
    }

    const data = await handlers[type as ReportType]();

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to generate report:", error);

    return NextResponse.json(
      { success: false, error: "Failed to generate report" },
      { status: 500 }
    );
  }
}