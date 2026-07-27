import { NextResponse } from "next/server";
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("token", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
export async function GET(request) { return NextResponse.redirect(new URL("/", request.url)); }
