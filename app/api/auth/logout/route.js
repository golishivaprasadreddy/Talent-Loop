import { NextResponse } from "next/server";
import { clearSessionCookie } from "../../../../lib/auth";
export async function POST() { const response = NextResponse.json({ success: true }); response.cookies.set(clearSessionCookie); return response; }
export async function GET(request) { const response = NextResponse.redirect(new URL("/", request.url)); response.cookies.set(clearSessionCookie); return response; }
