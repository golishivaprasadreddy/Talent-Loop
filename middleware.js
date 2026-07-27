import { NextResponse } from "next/server";
import { dashboardFor } from "./lib/rbac";
import { SESSION_COOKIE, verifySessionToken } from "./lib/session-token";

async function readSession(request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]
    || request.cookies.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

const AUTH_ROUTES = ["/login", "/register"];
const PROTECTED_ROUTES = ["/dashboard", "/recruiter", "/admin", "/apply", "/profile"];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Redirect logged-in users away from auth pages
  if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    const session = await readSession(request);
    if (session) return NextResponse.redirect(new URL(dashboardFor(session.role), request.url));
    return NextResponse.next();
  }

  // Redirect unauthenticated users away from protected pages
  if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    const session = await readSession(request);
    if (!session) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url));
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/dashboard", "/dashboard/:path*", "/recruiter", "/recruiter/:path*", "/admin", "/admin/:path*", "/apply", "/apply/:path*", "/profile", "/profile/:path*"],
};
