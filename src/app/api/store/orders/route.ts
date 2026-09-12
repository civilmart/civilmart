import { NextRequest, NextResponse } from "next/server";
import { ProductUnit } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { getCustomerUser, generateOrderNumber } from "@/lib/customer";
import { serializeOrder } from "@/lib/store-order";
import { getSiteSettings } from "@/lib/site-settings";
import { computeShipping } from "@/lib/money";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer, items, useLoggedIn = false } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Your cart is empty" },
        { status: 400 }
      );
    }

    const lineItems = items
      .map((i) => ({
        productId: typeof i?.productId === "string" ? i.productId : "",
        variantId: typeof i?.variantId === "string" ? i.variantId : null,
        quantity: Number(i?.quantity),
      }))
      .filter(
        (i) => i.productId && Number.isFinite(i.quantity) && i.quantity > 0
      );

    if (lineItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "Your cart is empty" },
        { status: 400 }
      );
    }

    let customerAccount = null;

    if (useLoggedIn) {
      customerAccount = await getCustomerUser();
    }

    if (!customerAccount) {
      const { username, password, name, email, phone, address } = customer ?? {};

      if (!username?.trim() || !password?.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: "Username and password are required to checkout",
          },
          { status: 400 }
        );
      }

      if (!email?.trim() && !phone?.trim()) {
        return NextResponse.json(
          { success: false, error: "Email or phone number is required" },
          { status: 400 }
        );
      }

      const cleanedUsername = username.trim().toLowerCase();
      const cleanedEmail = email?.trim()?.toLowerCase() || null;
      const cleanedPhone = phone?.trim() || null;

      const existing = await prisma.customer.findFirst({
        where: {
          OR: [
            { username: cleanedUsername },
            ...(cleanedEmail ? [{ email: cleanedEmail }] : []),
            ...(cleanedPhone ? [{ phone: cleanedPhone }] : []),
          ],
        },
      });

      if (existing) {
        if (verifyPassword(password, existing.passwordHash)) {
          customerAccount = existing;
        } else {
          return NextResponse.json(
            {
              success: false,
              error:
                "This account already exists with a different password. Please log in first.",
            },
            { status: 409 }
          );
        }
      } else {
        customerAccount = await prisma.customer.create({
          data: {
            username: cleanedUsername,
            passwordHash: hashPassword(password),
            name: name?.trim() || null,
            email: cleanedEmail,
            phone: cleanedPhone,
            address: address?.trim() || null,
          },
        });
      }
    }

    const productIds = Array.from(new Set(lineItems.map((i) => i.productId)));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, status: "ACTIVE" },
      include: { variants: true },
    });
    const productsById = new Map(products.map((p) => [p.id, p]));

    const resolvedItems: Array<{
      productId: string;
      variantId: string | null;
      quantity: number;
      unit: ProductUnit;
      sku: string;
      productName: string;
      variantName: string | null;
      imageUrl: string | null;
      unitPrice: number;
    }> = [];

    for (const item of lineItems) {
      const product = productsById.get(item.productId);

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            error: "One of the selected items is no longer available",
          },
          { status: 400 }
        );
      }

      let variant = null;

      if (item.variantId) {
        variant = product.variants.find((v) => v.id === item.variantId);

        if (!variant) {
          return NextResponse.json(
            {
              success: false,
              error: "One of the selected options is no longer available",
            },
            { status: 400 }
          );
        }
      }

      const unitPrice = variant?.price ?? product.price;

      if (unitPrice === null || unitPrice === undefined) {
        return NextResponse.json(
          {
            success: false,
            error: `${product.name} is not available for ordering`,
          },
          { status: 400 }
        );
      }

      if (Number(product.stockQuantity) < item.quantity) {
        return NextResponse.json(
          {
            success: false,
            error: `Only ${Number(product.stockQuantity)} ${product.unit.toLowerCase()} of ${product.name} are currently available`,
          },
          { status: 400 }
        );
      }

      resolvedItems.push({
        productId: product.id,
        variantId: variant?.id ?? null,
        quantity: Number(item.quantity.toFixed(4)),
        unit: product.unit as ProductUnit,
        sku: variant?.sku ?? product.code,
        productName: product.name,
        variantName: variant?.name ?? null,
        imageUrl: variant?.imageUrl ?? product.imageUrl,
        unitPrice: Number(unitPrice),
      });
    }

    const subtotal = resolvedItems.reduce(
      (sum, i) => sum + i.unitPrice * i.quantity,
      0
    );

    // Shipping is computed server-side from the site settings so visitors
    // can never tamper with it.
    const settings = await getSiteSettings();
    const shipping = computeShipping(
      subtotal,
      settings.shippingFee,
      settings.freeShippingThreshold
    );

    const total = subtotal + shipping;
    let orderNumber = "";
    let attempts = 0;

    const deliveryName =
      customer?.name?.trim() || customerAccount.name || customerAccount.username;
    const deliveryPhone = customer?.phone?.trim() || customerAccount.phone;
    const deliveryEmail = customer?.email?.trim() || customerAccount.email;

    if (!deliveryName || !deliveryPhone) {
      return NextResponse.json(
        { success: false, error: "Name and phone are required for delivery" },
        { status: 400 }
      );
    }

    if (!customer?.address?.trim()) {
      return NextResponse.json(
        { success: false, error: "Delivery address is required" },
        { status: 400 }
      );
    }

    while (attempts < 5) {
      orderNumber = generateOrderNumber();
      try {
        const order = await prisma.$transaction(async (tx) => {
          const created = await tx.customerOrder.create({
            data: {
              orderNumber,
              customerId: customerAccount!.id,
              customerName: deliveryName,
              phone: deliveryPhone,
              email: deliveryEmail,
              address: customer.address.trim(),
              city: customer?.city?.trim() || null,
              notes: customer?.notes?.trim() || null,
              paymentMethod: "COD",
              subtotal: String(subtotal.toFixed(2)),
              shipping: String(Number(shipping).toFixed(2)),
              total: String(total.toFixed(2)),
              items: {
                create: resolvedItems.map((i) => ({
                  productId: i.productId,
                  variantId: i.variantId,
                  sku: i.sku,
                  productName: i.productName,
                  variantName: i.variantName,
                  imageUrl: i.imageUrl,
                  quantity: i.quantity,
                  unit: i.unit,
                  unitPrice: String(i.unitPrice),
                })),
              },
              statusEvents: {
                create: [{ status: "PLACED", note: "Order placed" }],
              },
            },
            include: {
              items: true,
              statusEvents: { orderBy: { at: "asc" } },
            },
          });

          for (const item of resolvedItems) {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
              select: { stockQuantity: true },
            });

            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: String(
                  Number(product?.stockQuantity ?? 0) - item.quantity
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
                referenceType: "CUSTOMER_ORDER",
                referenceId: created.id,
                notes: `Order ${orderNumber} placed`,
              },
            });
          }

          return created;
        });

        // Keep the saved profile up to date so future orders prefill.
        if (customerAccount.userId) {
          const userUpdates: Record<string, string> = {};
          if (deliveryName && !customerAccount.name) {
            userUpdates.name = deliveryName;
          }
          if (deliveryPhone && !customerAccount.phone) {
            userUpdates.phone = deliveryPhone;
          }
          if (customer?.email?.trim() && !customerAccount.email) {
            userUpdates.email = customer.email.trim().toLowerCase();
          }
          if (customer?.address?.trim() && !customerAccount.address) {
            userUpdates.address = customer.address.trim();
          }
          if (customer?.city?.trim() && !customerAccount.city) {
            userUpdates.city = customer.city.trim();
          }

          if (Object.keys(userUpdates).length > 0) {
            await prisma.user.update({
              where: { id: customerAccount.userId },
              data: userUpdates,
            });
          }
        }

        const customerUpdates: Record<string, string> = {};
        if (deliveryName && deliveryName !== customerAccount.name) {
          customerUpdates.name = deliveryName;
        }
        if (deliveryPhone && deliveryPhone !== customerAccount.phone) {
          customerUpdates.phone = deliveryPhone;
        }
        if (customer?.email?.trim()) {
          customerUpdates.email = customer.email.trim().toLowerCase();
        }
        if (customer?.address?.trim()) {
          customerUpdates.address = customer.address.trim();
        }
        if (customer?.city?.trim()) {
          customerUpdates.city = customer.city.trim();
        }

        if (Object.keys(customerUpdates).length > 0) {
          await prisma.customer.update({
            where: { id: customerAccount.id },
            data: customerUpdates,
          });
        }

        return NextResponse.json(
          { success: true, data: { order: serializeOrder(order) } },
          { status: 201 }
        );
      } catch (error) {
        const isUnique = String(error).toLowerCase().includes("unique");

        if (!isUnique) {
          throw error;
        }

        attempts += 1;
      }
    }

    return NextResponse.json(
      { success: false, error: "Could not place order, please try again" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Place order failed:", error);

    return NextResponse.json(
      { success: false, error: "Order could not be placed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const customer = await getCustomerUser();

  if (!customer) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const orders = await prisma.customerOrder.findMany({
    where: { customerId: customer.id },
    include: { items: true, statusEvents: { orderBy: { at: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: orders.map(serializeOrder),
  });
}