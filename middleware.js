import { NextResponse } from "next/server";
import { ROUTE_PERMISSIONS, can, dashboardFor } from "./lib/rbac";
import { SESSION_COOKIE, verifySessionToken } from "./lib/session-token";

async function readSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function middleware(request) {
  const matchedRoute = ROUTE_PERMISSIONS.find((route) => request.nextUrl.pathname.startsWith(route.path));
  if (!matchedRoute) return NextResponse.next();

  const session = await readSession(request);
  if (!session) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set({ name: SESSION_COOKIE, value: "", httpOnly: true, path: "/", maxAge: 0 });
    return response;
  }

  if (!can(session.role, matchedRoute.permission)) {
    return NextResponse.redirect(new URL(dashboardFor(session.role), request.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/recruiter/:path*", "/admin/:path*", "/dashboard/candidate/:path*", "/dashboard/recruiter/:path*", "/dashboard/admin/:path*"] };
