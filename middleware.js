import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { ROUTE_PERMISSIONS, can, dashboardFor } from "./lib/rbac";

const SESSION_COOKIE = "talentloop_session";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "change-this-development-secret-before-production");

async function readSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
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
