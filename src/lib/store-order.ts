import { Prisma } from "@/generated/prisma/client";

export type CustomerOrderWithRelations = Prisma.CustomerOrderGetPayload<{
  include: {
    items: true;
    statusEvents: { orderBy: { at: "asc" } };
  };
}>;

export function serializeOrder(order: CustomerOrderWithRelations) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    phone: order.phone,
    email: order.email,
    address: order.address,
    city: order.city,
    notes: order.notes,
    paymentMethod: order.paymentMethod,
    status: order.status,
    subtotal: Number(order.subtotal),
    shipping: Number(order.shipping),
    total: Number(order.total),
    createdAt: order.createdAt,
    items: order.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      variantId: i.variantId,
      sku: i.sku,
      productName: i.productName,
      variantName: i.variantName,
      imageUrl: i.imageUrl,
      quantity: Number(i.quantity),
      unit: i.unit,
      unitPrice: Number(i.unitPrice),
    })),
    statusEvents: order.statusEvents.map((e) => ({
      id: e.id,
      status: e.status,
      note: e.note,
      at: e.at,
    })),
  };
}