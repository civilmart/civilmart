import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_COOKIE } from "@/lib/session";
import { getCustomerUser } from "@/lib/customer";

export async function GET() {
  const customer = await getCustomerUser();

  if (!customer) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  return NextResponse.json({
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
}

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set(CUSTOMER_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}