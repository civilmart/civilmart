import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow, hashPassword } from "@/lib/auth";
import { randomBytes } from "node:crypto";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim();

    const customers = await prisma.customer.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      include: {
        _count: {
          select: { orders: true, invoices: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        city: customer.city,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        orderCount: customer._count.orders,
        invoiceCount: customer._count.invoices,
      })),
    });
  } catch (error) {
    console.error("GET customers error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await getSessionUserOrThrow();
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = String(body.email ?? "").trim();
    const city = String(body.city ?? "").trim();
    const address = String(body.address ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Customer name is required" },
        { status: 400 }
      );
    }

    if (phone) {
      const existing = await prisma.customer.findUnique({ where: { phone } });

      if (existing) {
        return NextResponse.json(
          { success: false, error: `Phone already exists: ${phone}` },
          { status: 409 }
        );
      }
    }

    if (email) {
      const existing = await prisma.customer.findUnique({ where: { email } });

      if (existing) {
        return NextResponse.json(
          { success: false, error: `Email already exists: ${email}` },
          { status: 409 }
        );
      }
    }

    const customer = await prisma.customer.create({
      data: {
        username: `cust-${Date.now()}`,
        passwordHash: hashPassword(randomBytes(24).toString("hex")),
        name: name || null,
        phone: phone || null,
        email: email || null,
        city: city || null,
        address: address || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        city: customer.city,
        address: customer.address,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("POST customer error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to create customer" },
      { status: 500 }
    );
  }
}