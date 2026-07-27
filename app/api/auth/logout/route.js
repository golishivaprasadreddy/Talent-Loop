import { NextResponse } from "next/server";
import { clearSessionCookie } from "../../../../lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(clearSessionCookie);
  response.cookies.set({ name: "token", value: "", httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
export async function GET(request) { return NextResponse.redirect(new URL("/", request.url)); }
