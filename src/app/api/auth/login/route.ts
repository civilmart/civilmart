import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  signSessionToken,
  verifyPassword,
  SESSION_COOKIE,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        username: username.trim().toLowerCase(),
        isActive: true,
      },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const valid = verifyPassword(password, user.passwordHash);

    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const token = await signSessionToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Login failed:", error);

    return NextResponse.json(
      { success: false, error: "Login failed" },
      { status: 500 }
    );
  }
}
