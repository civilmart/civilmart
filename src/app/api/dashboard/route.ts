import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      productCount,
      supplierCount,
      products,
      purchaseOrders,
      orderCounts,
      orderTotals,
      invoiceTotals,
      recentPurchases,
      recentOrders,
      topSellers,
    ] = await Promise.all([
      prisma.product.count({ where: { status: "ACTIVE" } }),
      prisma.supplier.count({ where: { isActive: true } }),
      prisma.product.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          unit: true,
          stockQuantity: true,
          category: { select: { name: true } },
        },
      }),
      prisma.purchaseOrder.findMany({
        where: { status: { notIn: ["RECEIVED", "CANCELLED"] } },
        select: { id: true },
      }),
      prisma.customerOrder.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.customerOrder.aggregate({
        where: { status: { not: "CANCELLED" } },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: { paymentStatus: { in: ["UNPAID", "PARTIAL"] } },
        _sum: { totalAmount: true, paidAmount: true },
      }),
      prisma.purchase.findMany({
        include: { supplier: { select: { name: true } } },
        orderBy: { purchaseDate: "desc" },
        take: 8,
      }),
      prisma.customerOrder.findMany({
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.customerOrderItem.groupBy({
        by: ["productId", "productName"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 8,
      }),
    ]);

    const lowStockItems: Array<{
      id: string;
      code: string;
      name: string;
      unit: string;
      currentStock: number;
    }> = [];
    const outOfStockItems: Array<{
      id: string;
      code: string;
      name: string;
      unit: string;
      currentStock: number;
    }> = [];
    const stockValue = 0;

    for (const product of products) {
      const stock = Number(product.stockQuantity);

      if (stock <= 0) {
        outOfStockItems.push({
          id: product.id,
          code: product.code,
          name: product.name,
          unit: product.unit,
          currentStock: stock,
        });
      }
    }

    const orderStatusCounts: Record<string, number> = {};
    for (const group of orderCounts) {
      orderStatusCounts[group.status] = group._count._all;
    }

    const totalOrders = orderCounts.reduce(
      (sum, group) => sum + group._count._all,
      0
    );
    const delivered = orderStatusCounts["DELIVERED"] ?? 0;
    const cancelled = orderStatusCounts["CANCELLED"] ?? 0;

    const unpaidInvoices = invoiceTotals._sum.totalAmount ?? 0;
    const paidOnInvoices = invoiceTotals._sum.paidAmount ?? 0;

    const activity = [
      ...recentPurchases.map((purchase) => ({
        id: purchase.id,
        type: "PURCHASE",
        title: `Purchase ${purchase.purchaseNo}`,
        detail: purchase.supplier?.name ?? "Unknown supplier",
        amount: Number(purchase.totalAmount),
        date: purchase.purchaseDate.toISOString(),
      })),
      ...recentOrders.map((order) => ({
        id: order.id,
        type: "ORDER",
        title: `Order ${order.orderNumber}`,
        detail: `${order.customerName} · ${
          order.status === "CANCELLED" ? "cancelled" : order.status.toLowerCase()
        }`,
        amount: Number(order.total),
        date: order.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          products: productCount,
          suppliers: supplierCount,
          lowStock: lowStockItems.length,
          outOfStock: outOfStockItems.length,
          openPurchaseOrders: purchaseOrders.length,
          stockValue,
          outstandingInvoices: Number(
            (Number(unpaidInvoices) - Number(paidOnInvoices)).toFixed(2)
          ),
        },
        revenue: Number(orderTotals._sum.total ?? 0),
        storeOrderStats: {
          total: totalOrders,
          open: totalOrders - delivered - cancelled,
          new: (orderStatusCounts["PLACED"] ?? 0) + (orderStatusCounts["CONFIRMED"] ?? 0),
          delivered,
          cancelled,
        },
        lowStockItems: lowStockItems.slice(0, 8),
        outOfStockItems: outOfStockItems.slice(0, 8),
        topSellingItems: topSellers.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantitySold: Number(item._sum.quantity ?? 0),
        })),
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          status: order.status,
          total: Number(order.total),
          itemCount: order.items.reduce((sum, item) => sum + Number(item.quantity), 0),
          createdAt: order.createdAt,
        })),
        activity,
      },
    });
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}