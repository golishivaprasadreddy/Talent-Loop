import { cookies } from "next/headers";
import { createSessionToken, verifySessionToken, SESSION_COOKIE } from "./session-token";

export { SESSION_COOKIE };

export async function createSession(user, remember = false) {
  return createSessionToken(user, remember);
}

export async function getSession() {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export function sessionCookie(token, remember = false) {
  return { name: SESSION_COOKIE, value: token, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7 };
}

export const clearSessionCookie = { name: SESSION_COOKIE, value: "", httpOnly: true, path: "/", maxAge: 0 };
