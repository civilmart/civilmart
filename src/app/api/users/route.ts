import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow, hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    await getSessionUserOrThrow();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getSessionUserOrThrow();

    if (currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Only admins can create users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, name, email, password, role } = body;

    if (!username?.trim() || !name?.trim() || !password?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Username, name, and password are required",
        },
        { status: 400 }
      );
    }

    const validRoles = [
      "ADMIN",
      "MANAGER",
      "STOREKEEPER",
      "PRODUCTION",
      "QC",
      "PURCHASE",
      "VIEWER",
    ];

    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
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
        role: role || "VIEWER",
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Failed to create user:", error);

    return NextResponse.json(
      { success: false, error: "Failed to create user" },
      { status: 500 }
    );
  }
}
