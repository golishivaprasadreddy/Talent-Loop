import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "change-this-development-secret-before-production");
export const SESSION_COOKIE = "talentloop_session";
const SESSION_TTL = "7d";

export async function createSession(user) {
  return new SignJWT({ userId: user._id.toString(), role: user.role, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secret);
}

export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export function sessionCookie(token, remember = false) {
  return { name: SESSION_COOKIE, value: token, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7 };
}

export const clearSessionCookie = { name: SESSION_COOKIE, value: "", httpOnly: true, path: "/", maxAge: 0 };
