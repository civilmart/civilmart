import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { CUSTOMER_COOKIE, signCustomerToken } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, name, email, phone, address } = body;

    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" },
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
    const cleanedEmail = email?.trim()?.toLowerCase() ?? null;
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
      let error = "That username is already taken";
      if (cleanedEmail && existing.email === cleanedEmail) {
        error = "An account with this email already exists";
      } else if (cleanedPhone && existing.phone === cleanedPhone) {
        error = "An account with this phone number already exists";
      }
      return NextResponse.json(
        { success: false, error },
        { status: 409 }
      );
    }

    // Do not allow a customer to shadow a staff account identity.
    const staff = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanedUsername },
          ...(cleanedEmail ? [{ email: cleanedEmail }] : []),
          ...(cleanedPhone ? [{ phone: cleanedPhone }] : []),
        ],
      },
    });

    if (staff) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This username/email/phone belongs to a staff account. Please log in instead.",
        },
        { status: 409 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        username: cleanedUsername,
        passwordHash: hashPassword(password),
        name: name?.trim() || null,
        email: cleanedEmail,
        phone: cleanedPhone,
        address: address?.trim() || null,
      },
    });

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
    console.error("Customer registration failed:", error);

    return NextResponse.json(
      { success: false, error: "Registration failed" },
      { status: 500 }
    );
  }
}