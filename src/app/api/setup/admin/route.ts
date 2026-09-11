import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const userCount = await prisma.user.count();

    if (userCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Setup is no longer available. Users already exist.",
        },
        { status: 409 }
      );
    }

    const body = await request.json();
    const { username, password, name, email } = body;

    if (!username?.trim() || !name?.trim() || !password?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Username, name, and password are required",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 6 characters",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username.trim().toLowerCase() },
          ...(email?.trim() ? [{ email: email.trim().toLowerCase() }] : []),
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error:
            existing.username === username.trim().toLowerCase()
              ? "Username already exists"
              : "Email already exists",
        },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        username: username.trim().toLowerCase(),
        name: name.trim(),
        email: email?.trim()?.toLowerCase() || null,
        passwordHash: hashPassword(password),
        role: "ADMIN",
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Setup admin failed:", error);

    return NextResponse.json(
      { success: false, error: "Setup failed" },
      { status: 500 }
    );
  }
}