import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { CUSTOMER_COOKIE, signCustomerToken } from "@/lib/session";
import { getOrCreateLinkedCustomer } from "@/lib/customer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier?.trim() || !password?.trim()) {
      return NextResponse.json(
        { success: false, error: "Email/phone/username and password are required" },
        { status: 400 }
      );
    }

    const cleaned = identifier.trim().toLowerCase();
    const phone = identifier.trim();

    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { username: cleaned },
          { email: cleaned },
          { phone },
        ],
      },
    });

    if (!customer) {
      // Fall back to staff accounts (admin / manager / etc.) so they can
      // shop on the storefront as a customer with the same credentials.
      const staff = await prisma.user.findFirst({
        where: {
          isActive: true,
          OR: [
            { username: cleaned },
            ...(cleaned.includes("@") ? [{ email: cleaned }] : []),
            { phone },
          ],
        },
      });

      if (staff?.passwordHash && verifyPassword(password, staff.passwordHash)) {
        customer = await getOrCreateLinkedCustomer(staff);
      }
    }

    if (!customer || !verifyPassword(password, customer.passwordHash)) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await signCustomerToken({
      id: customer.id,
      username: customer.username,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        id: customer.id,
        username: customer.username,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        isStaff: Boolean(customer.userId),
        userId: customer.userId,
      },
    });

    response.cookies.set(CUSTOMER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Customer login failed:", error);

    return NextResponse.json(
      { success: false, error: "Login failed" },
      { status: 500 }
    );
  }
}