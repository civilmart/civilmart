import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow, hashPassword } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    await getSessionUserOrThrow();
    const { id } = await context.params;

    const user = await prisma.user.findUnique({
      where: { id },
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
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Failed to fetch user:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const currentUser = await getSessionUserOrThrow();
    const { id } = await context.params;
    const body = await request.json();

    if (!isAdminRole(currentUser.role) && currentUser.id !== id) {
      return NextResponse.json(
        { success: false, error: "Can only edit your own profile" },
        { status: 403 }
      );
    }

    const target = await prisma.user.findUnique({ where: { id } });

    if (!target) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    if (target.role === "SUPERADMIN" && currentUser.role !== "SUPERADMIN") {
      return NextResponse.json(
        { success: false, error: "Only a super admin can manage super admins" },
        { status: 403 }
      );
    }

    const { name, email, role, isActive, password } = body;

    const data: Record<string, unknown> = {};

    if (name !== undefined) data.name = name.trim();
    if (email !== undefined) data.email = email?.trim()?.toLowerCase() || null;

    if (isAdminRole(currentUser.role)) {
      if (role !== undefined) {
        if (role === "SUPERADMIN" && currentUser.role !== "SUPERADMIN") {
          return NextResponse.json(
            { success: false, error: "Only a super admin can grant the super admin role" },
            { status: 403 }
          );
        }
        data.role = role;
      }
      if (isActive !== undefined) data.isActive = isActive;
    }

    if (password?.trim()) {
      data.passwordHash = hashPassword(password);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
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
    });

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Failed to update user:", error);

    return NextResponse.json(
      { success: false, error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const currentUser = await getSessionUserOrThrow();

    if (!isAdminRole(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Only admins can delete users" },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (currentUser.id === id) {
      return NextResponse.json(
        { success: false, error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({ where: { id } });

    if (target?.role === "SUPERADMIN" && currentUser.role !== "SUPERADMIN") {
      return NextResponse.json(
        { success: false, error: "Only a super admin can delete super admins" },
        { status: 403 }
      );
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);

    return NextResponse.json(
      { success: false, error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
