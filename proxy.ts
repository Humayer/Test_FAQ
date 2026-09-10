import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "dp_hr_admin_session";

// NOTE: this file intentionally only verifies the JWT signature. Full checks
// (e.g. re-reading admin email/hash) happen again in each protected API
// route via lib/auth/adminAuth.ts, which also needs Prisma/bcrypt.
function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  try {
    jwt.verify(token, secret);
    return true;
  } catch {
    return false;
  }
}

// Endpoints that must stay reachable without an existing admin session:
// signing in obviously can't require already being signed in, and logout
// should always succeed even if the session cookie is stale/invalid.
const PUBLIC_ADMIN_API_PATHS = new Set(["/api/admin/login", "/api/admin/logout"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminApi = pathname.startsWith("/api/admin") && !PUBLIC_ADMIN_API_PATHS.has(pathname);

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const authed = isValidToken(token);

  if (authed) {
    return NextResponse.next();
  }

  if (isAdminApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
