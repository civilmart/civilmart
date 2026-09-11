import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { isAdminRole, isStaffRole } from "@/lib/roles";

const publicApiPrefixes = [
  "/api/store",
  "/api/auth",
  "/api/setup",
];

const adminOnlyPaths = ["/admin/users", "/admin/settings", "/api/users"];

function isPublicApi(pathname: string): boolean {
  return publicApiPrefixes.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function isAdminPath(pathname: string): boolean {
  return adminOnlyPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function redirectToLogin(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // All storefront pages and the admin login page are public.
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Public API endpoints (storefront, customer auth, setup).
  if (pathname.startsWith("/api/") && isPublicApi(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token || pathname === "/admin/login") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    return redirectToLogin(request);
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

    return redirectToLogin(request);
  }

  // Normal end-users / visitors cannot enter the admin interface.
  if (!isStaffRole(payload.role)) {
    request.cookies.delete(SESSION_COOKIE);

    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    return redirectToLogin(request);
  }

  // Only admins and super admins can manage users / settings.
  if (isAdminPath(pathname) && !isAdminRole(payload.role)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};