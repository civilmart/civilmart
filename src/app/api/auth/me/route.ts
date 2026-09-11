import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}
