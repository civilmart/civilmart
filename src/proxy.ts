import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const publicPaths = ["/login", "/api/auth/login", "/api/auth/logout", "/api/auth/me", "/api/setup/admin"];
const adminOnlyPaths = ["/users", "/settings", "/api/users"];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function isAdminPath(pathname: string): boolean {
  return adminOnlyPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    request.cookies.delete(SESSION_COOKIE);

    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 401 }
      );
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isAdminPath(pathname) && payload.role !== "ADMIN") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
